import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DEFAULT_SETTINGS } from './lib/demo-data'
import { getSettings } from './lib/api'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { NotFoundPage } from './pages/NotFoundPage'
import type { SiteSettings } from './types'

const ItemPage = lazy(() => import('./pages/ItemPage').then((module) => ({ default: module.ItemPage })))
const PresentationPage = lazy(() => import('./pages/PresentationPage').then((module) => ({ default: module.PresentationPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const StudioPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioPage })))
const StudioEditorPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioEditorPage })))
const StudioLoginPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioLoginPage })))
const StudioSettingsPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioSettingsPage })))
const PlannerPage = lazy(() => import('./pages/studio/PlannerPage').then((module) => ({ default: module.PlannerPage })))

interface SiteContextValue {
  settings: SiteSettings
  setSettings: (settings: SiteSettings) => void
}

type Theme = 'light' | 'dark'
interface ThemeContextValue { theme: Theme; toggleTheme: () => void }

const SiteContext = createContext<SiteContextValue>({ settings: DEFAULT_SETTINGS, setSettings: () => undefined })
const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggleTheme: () => undefined })

export function useSite() {
  return useContext(SiteContext)
}

export function useTheme() {
  return useContext(ThemeContext)
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!pathname.startsWith('/present/')) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('nya-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* Follow the device preference. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171d1a' : '#3b4f42')
    try { localStorage.setItem('nya-theme', theme) } catch { /* The theme still works for this visit. */ }
  }, [theme])

  const contextValue = useMemo(() => ({ settings, setSettings }), [settings])
  const themeValue = useMemo(() => ({ theme, toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light') }), [theme])

  return (
    <ThemeContext.Provider value={themeValue}>
      <SiteContext.Provider value={contextValue}>
      <ScrollToTop />
      <Suspense fallback={<div className="route-loading" role="status">Opening…</div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="presentations" element={<LibraryPage fixedType="presentation" />} />
          <Route path="notes" element={<LibraryPage fixedType="note" />} />
          <Route path="projects" element={<LibraryPage fixedType="project" />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="item/:slug" element={<ItemPage />} />
          <Route path="studio/login" element={<StudioLoginPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="studio/new/:type" element={<StudioEditorPage />} />
          <Route path="studio/edit/:id" element={<StudioEditorPage />} />
          <Route path="studio/settings" element={<StudioSettingsPage />} />
          <Route path="studio/planner" element={<PlannerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="present/:slug" element={<PresentationPage />} />
      </Routes>
      </Suspense>
      </SiteContext.Provider>
    </ThemeContext.Provider>
  )
}
