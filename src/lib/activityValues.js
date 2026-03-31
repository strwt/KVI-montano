export const SUPPORTED_FIELD_TYPES = ['text', 'number', 'date', 'boolean']

const isSupportedFieldType = (value) => SUPPORTED_FIELD_TYPES.includes(String(value || '').trim())

const requireRecordId = (value) => {
  const recordId = String(value || '').trim()
  if (!recordId) throw new Error('recordId is required.')
  return recordId
}

const requireFieldId = (value) => {
  const fieldId = String(value || '').trim()
  if (!fieldId) throw new Error('fieldId is required.')
  return fieldId
}

const coerceDateToIsoMidnightUtc = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  // HTML <input type="date" /> returns YYYY-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  return `${raw}T00:00:00.000Z`
}

export const buildActivityValueRow = ({ recordId, fieldId, fieldType, value }) => {
  const safeRecordId = requireRecordId(recordId)
  const safeFieldId = requireFieldId(fieldId)
  const safeFieldType = String(fieldType || '').trim()
  if (!isSupportedFieldType(safeFieldType)) throw new Error('Unsupported fieldType.')

  if (safeFieldType === 'text') {
    const text = String(value ?? '').trim()
    if (!text) throw new Error('Text value is required.')
    return { record_id: safeRecordId, field_id: safeFieldId, value_text: text }
  }

  if (safeFieldType === 'number') {
    const raw = typeof value === 'number' ? value : Number(String(value ?? '').trim())
    if (!Number.isFinite(raw)) throw new Error('Number value is required.')
    return { record_id: safeRecordId, field_id: safeFieldId, value_number: raw }
  }

  if (safeFieldType === 'date') {
    const iso = coerceDateToIsoMidnightUtc(value)
    if (!iso) throw new Error('Date value is required.')
    return { record_id: safeRecordId, field_id: safeFieldId, value_date: iso }
  }

  if (safeFieldType === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Boolean value is required.')
    return { record_id: safeRecordId, field_id: safeFieldId, value_boolean: value }
  }

  throw new Error('Unsupported fieldType.')
}

