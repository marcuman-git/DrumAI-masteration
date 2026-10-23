import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Temporarily disabling SW registration to avoid stale cached index/assets on Pages.
// We can re-enable after deployment is stable.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
