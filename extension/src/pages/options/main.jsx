import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { AppProviders } from '@/context/AppProviders'
import { OptionsPage } from './OptionsPage'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <OptionsPage />
    </AppProviders>
  </StrictMode>,
)