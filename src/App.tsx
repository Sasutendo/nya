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
const StudioPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioPage })))
const StudioEditorPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioEditorPage })))
const StudioLoginPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioLoginPage })))
const StudioSettingsPage = lazy(() => import('./pages/studio/StudioPages').then((module) => ({ default: module.StudioSettingsPage })))

interface SiteContextValue {
  settings: SiteSettings
  setSettings: (settings: SiteSettings) => void
}

const SiteContext = createContext<SiteContextValue>({ settings: DEFAULT_SETTINGS, setSettings: () => undefined })

export function useSite() {
  return useContext(SiteContext)
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

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const contextValue = useMemo(() => ({ settings, setSettings }), [settings])

  return (
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
          <Route path="item/:slug" element={<ItemPage />} />
          <Route path="studio/login" element={<StudioLoginPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="studio/new/:type" element={<StudioEditorPage />} />
          <Route path="studio/edit/:id" element={<StudioEditorPage />} />
          <Route path="studio/settings" element={<StudioSettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="present/:slug" element={<PresentationPage />} />
      </Routes>
      </Suspense>
    </SiteContext.Provider>
  )
}
