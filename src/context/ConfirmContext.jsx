import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

const DEFAULT_OPTIONS = {
  title: 'Are you sure?',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: true,
}

function ConfirmDialog({ open, options, onCancel, onConfirm }) {
  const { title, description, confirmText, cancelText, danger } = options || DEFAULT_OPTIONS

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
    ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close confirmation"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
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
  const [dialog, setDialog] = useState({ open: false, options: DEFAULT_OPTIONS })

  const close = useCallback((result) => {
    setDialog(prev => ({ ...prev, open: false }))
    const resolve = resolverRef.current
    resolverRef.current = null
    if (resolve) resolve(Boolean(result))
  }, [])

  const confirm = useCallback((options = {}) => {
    const merged = { ...DEFAULT_OPTIONS, ...(options && typeof options === 'object' ? options : {}) }
    setDialog({ open: true, options: merged })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={dialog.open}
        options={dialog.options}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}

