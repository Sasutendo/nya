import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js').catch((reason) => console.warn('Offline app registration failed', reason))
})
