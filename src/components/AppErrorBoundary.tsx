import { Component, type ErrorInfo, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nya corner render failed', error, info)
  }

  async recover() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys().catch(() => [])
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main className="app-crash-screen">
      <div><span>♡</span><p>tiny technical pause</p><h1>The corner needs a quick refresh.</h1><p>An older saved website file or a temporary browser error stopped this page from opening.</p><button type="button" onClick={() => void this.recover()}>Clear saved site files and reload</button><details><summary>Technical detail</summary><code>{this.state.error.message}</code></details></div>
    </main>
  }
}
