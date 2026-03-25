import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_PASSWORD = 'qwerty54321'
const DEFAULT_ROLE = 'member'
const EMAIL_DOMAIN = 'id.kusgan.local'

const resolveProjectPath = (...segments) => path.resolve(__dirname, '..', ...segments)

const loadEnvFile = (filename) => {
  const envPath = resolveProjectPath(filename)
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx === -1) return
    const key = trimmed.slice(0, idx).trim()
    if (!key) return
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
}

const normalizeName = (value = '') => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
const normalizeIdKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const parseBlock = (source, startToken, endToken) => {
  const startIndex = source.indexOf(startToken)
  if (startIndex === -1) return ''
  const endIndex = source.indexOf(endToken, startIndex + startToken.length)
  if (endIndex === -1) return ''
  return source.slice(startIndex + startToken.length, endIndex)
}

const parseArrayLiteralStrings = (source) => {
  const results = []
  const regex = /'([^'\\]*(?:\\.[^'\\]*)*)'/g
  let match
  while ((match = regex.exec(source))) {
    const value = match[1]
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
    if (value.trim()) results.push(value.trim())
  }
  return results
}

const loadVolunteerNames = () => {
  const landingPath = resolveProjectPath('src', 'pages', 'Landing.jsx')
  const landingSource = fs.readFileSync(landingPath, 'utf8')
  const volunteerArrayBlock = parseBlock(
    landingSource,
    'const KUSGAN_VOLUNTEERS = [',
    ']'
  )
  const volunteerNames = parseArrayLiteralStrings(volunteerArrayBlock)
  if (!volunteerNames.length) {
    throw new Error('No volunteers found in KUSGAN_VOLUNTEERS.')
  }
  return volunteerNames
}

const toIdNumber = (index) => String(index + 1).padStart(3, '0')

const syncVolunteers = async ({ dryRun }) => {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const supabaseServiceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/\s+/g, '')
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in env.')
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const volunteerNames = loadVolunteerNames()
  const desired = volunteerNames.map((name, index) => ({
    name,
    idNumber: toIdNumber(index),
  }))

  const desiredNameSet = new Set(desired.map(entry => normalizeName(entry.name)))
  const desiredIdSet = new Set(desired.map(entry => entry.idNumber))

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,name,email,role,id_number')

  if (profileError) {
    throw new Error(profileError.message || 'Unable to read profiles.')
  }

  const profileList = Array.isArray(profiles) ? profiles : []
  const profilesByName = new Map()
  const profilesByIdNumber = new Map()

  profileList.forEach(profile => {
    const nameKey = normalizeName(profile?.name || '')
    if (nameKey && !profilesByName.has(nameKey)) profilesByName.set(nameKey, profile)
    const idNumber = String(profile?.id_number || '').trim()
    if (idNumber && !profilesByIdNumber.has(idNumber)) profilesByIdNumber.set(idNumber, profile)
  })

  const toCreate = []
  desired.forEach(entry => {
    const nameKey = normalizeName(entry.name)
    if (profilesByName.has(nameKey)) return
    if (profilesByIdNumber.has(entry.idNumber)) return
    toCreate.push(entry)
  })

  const scriptCreatedCandidates = profileList.filter(profile => {
    const email = String(profile?.email || '').toLowerCase()
    return email.endsWith(`@${EMAIL_DOMAIN}`)
  })

  const toDelete = scriptCreatedCandidates.filter(profile => {
    const role = String(profile?.role || '').toLowerCase()
    if (role === 'admin') return false
    const nameKey = normalizeName(profile?.name || '')
    if (nameKey && desiredNameSet.has(nameKey)) return false
    const idNumber = String(profile?.id_number || '').trim()
    if (idNumber && desiredIdSet.has(idNumber)) return false
    return true
  })

  if (dryRun) {
    console.log(`Would create: ${toCreate.length}`)
    toCreate.forEach(entry => console.log(`+ ${entry.idNumber} - ${entry.name}`))
    console.log(`Would delete: ${toDelete.length}`)
    toDelete.forEach(entry => console.log(`- ${entry.id_number || 'N/A'} - ${entry.name || 'N/A'}`))
    return
  }

  let created = 0
  let skipped = desired.length - toCreate.length
  const createFailures = []

  for (const entry of toCreate) {
    const idKey = normalizeIdKey(entry.idNumber)
    const email = `${idKey}@${EMAIL_DOMAIN}`

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      app_metadata: { role: DEFAULT_ROLE },
      user_metadata: {
        name: entry.name,
        id_number: entry.idNumber,
      },
    })

    if (createError) {
      createFailures.push({ name: entry.name, idNumber: entry.idNumber, message: createError.message })
      continue
    }

    const newUserId = createdUser?.user?.id
    if (!newUserId) {
      createFailures.push({ name: entry.name, idNumber: entry.idNumber, message: 'Missing user id.' })
      continue
    }

    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          name: entry.name,
          role: DEFAULT_ROLE,
          id_number: entry.idNumber,
          email,
        },
        { onConflict: 'id' }
      )

    if (profileUpsertError) {
      createFailures.push({ name: entry.name, idNumber: entry.idNumber, message: profileUpsertError.message })
      continue
    }

    created += 1
  }

  let deleted = 0
  const deleteFailures = []

  for (const profile of toDelete) {
    const userId = String(profile?.id || '').trim()
    if (!userId) continue

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      deleteFailures.push({ id: userId, name: profile?.name || '', message: authDeleteError.message })
      continue
    }

    const { error: activityError } = await supabaseAdmin
      .from('login_activity')
      .delete()
      .eq('user_id', userId)
    if (activityError) {
      deleteFailures.push({ id: userId, name: profile?.name || '', message: activityError.message })
      continue
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (profileDeleteError) {
      deleteFailures.push({ id: userId, name: profile?.name || '', message: profileDeleteError.message })
      continue
    }

    deleted += 1
  }

  console.log(`Created: ${created}`)
  console.log(`Skipped (already exists): ${skipped}`)
  console.log(`Create failed: ${createFailures.length}`)
  console.log(`Deleted: ${deleted}`)
  console.log(`Delete failed: ${deleteFailures.length}`)

  if (createFailures.length) {
    createFailures.forEach(entry => {
      console.log(`Create failed ${entry.idNumber} - ${entry.name}: ${entry.message}`)
    })
  }
  if (deleteFailures.length) {
    deleteFailures.forEach(entry => {
      console.log(`Delete failed ${entry.id} - ${entry.name}: ${entry.message}`)
    })
  }
}

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  await syncVolunteers({ dryRun })
}

main().catch(error => {
  console.error(error?.message || error)
  process.exit(1)
})
