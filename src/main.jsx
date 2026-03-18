import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const strictModeEnabled = String(import.meta.env.VITE_STRICT_MODE || 'true').toLowerCase() !== 'false'

createRoot(document.getElementById('root')).render(
  strictModeEnabled ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  ),
)
