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

// Earlier builds used an app-shell service worker that could retain obsolete hashed bundles.
// The site is network-first, so remove old registrations and caches instead of risking a blank page.
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => undefined)
if ('caches' in window) caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('nya-shell-')).map((key) => caches.delete(key)))).catch(() => undefined)
