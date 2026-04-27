import { createContext } from 'react'

export const ConfirmContext = createContext(null)

export const DEFAULT_CONFIRM_OPTIONS = {
  title: 'Are you sure?',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: true,
}

