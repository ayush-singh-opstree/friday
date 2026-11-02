import { version } from '../../package.json'

/** Static product metadata for the extension surfaces (headers, About panel). */
export const APP = Object.freeze({
  name: 'Threadwise',
  companionName: 'Threadwise Companion',
  tagline: 'The relationship memory layer for professionals',
  version,
  /** Deep link into the web app; `path` is appended after a hash route. */
  webUrl: (path = '') => {
    const base = (import.meta.env.VITE_APP_WEB_URL ?? 'https://threadwise.app').replace(/\/+$/, '')
    return path ? `${base}/${path.replace(/^\/+/, '')}` : base
  },
  docs: {
    privacy: 'https://threadwise.app/privacy',
    support: 'https://threadwise.app/support',
  },
})

/** Navigation for the side panel / options surfaces. */
export const OPTIONS_SECTIONS = Object.freeze([
  { key: 'account', label: 'Account', icon: 'UserCircle' },
  { key: 'appearance', label: 'Appearance', icon: 'PaintBrush' },
  { key: 'notifications', label: 'Notifications', icon: 'Bell' },
  { key: 'about', label: 'About', icon: 'Info' },
])

/** Views available inside the popup. */
export const POPUP_VIEWS = Object.freeze([
  { key: 'today', label: 'Today' },
  { key: 'capture', label: 'Capture' },
])

/** Views available inside the side panel. */
export const SIDEPANEL_VIEWS = Object.freeze([
  { key: 'context', label: 'On this page' },
  { key: 'today', label: 'Today' },
  { key: 'capture', label: 'Capture' },
])
