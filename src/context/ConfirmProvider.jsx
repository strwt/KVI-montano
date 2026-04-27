import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmContext, DEFAULT_CONFIRM_OPTIONS } from './confirmContext'

function ConfirmDialog({ open, options, onCancel, onConfirm }) {
  const { title, description, confirmText, cancelText, danger } = options || DEFAULT_CONFIRM_OPTIONS

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, open])

  if (!open) return null

  const confirmTone = danger
    ? 'bg-red-500/90 text-white hover:bg-red-500'
    : 'bg-white/10 text-white hover:bg-white/15'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.62)',
          backdropFilter: 'blur(10px)',
        }}
        aria-label="Close confirmation"
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: 'rgba(4, 18, 33, 0.78)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <div
          className="h-1.5 w-full"
          style={{
            background: 'linear-gradient(90deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95), rgba(125,211,252,0.85))',
          }}
        />

        <div className="p-6">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-white/75">{description}</p> : null}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${confirmTone}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmProvider({ children }) {
  const resolverRef = useRef(null)
  const [dialog, setDialog] = useState({ open: false, options: DEFAULT_CONFIRM_OPTIONS })

  const close = useCallback((result) => {
    setDialog((prev) => ({ ...prev, open: false }))
    const resolve = resolverRef.current
    resolverRef.current = null
    if (resolve) resolve(Boolean(result))
  }, [])

  const confirm = useCallback((options = {}) => {
    const merged = { ...DEFAULT_CONFIRM_OPTIONS, ...(options && typeof options === 'object' ? options : {}) }
    setDialog({ open: true, options: merged })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog open={dialog.open} options={dialog.options} onCancel={() => close(false)} onConfirm={() => close(true)} />
    </ConfirmContext.Provider>
  )
}

