import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { AppProviders } from '@/context/AppProviders'
import { PopupPage } from './PopupPage'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <PopupPage />
    </AppProviders>
  </StrictMode>,
)