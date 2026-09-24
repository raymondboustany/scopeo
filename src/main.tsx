import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/theme.css'
import { App } from './app/App'

import { useSession } from './lib/store'
import { LANG, tr } from './i18n'

document.documentElement.lang = LANG
document.title = tr('Scopeo : cadrage réglementaire RGPD, NIS2, DORA, CRA, AI Act', 'Scopeo: regulatory scoping for GDPR, NIS2, DORA, CRA and the AI Act')

// Le thème suit la préférence enregistrée ; clair par défaut.
const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0d11' : '#f5f6f8')
}
applyTheme(useSession.getState().theme)
useSession.subscribe((s) => applyTheme(s.theme))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
