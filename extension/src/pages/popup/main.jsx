import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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