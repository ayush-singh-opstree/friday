import { version } from '../../package.json'

/** Static product metadata used in headers, Settings and the About panel. */
export const APP = Object.freeze({
  name: 'Friday',
  tagline: 'The relationship memory layer for professionals',
  version,
  /** Absolute URL builder for shareable web-app links. */
  url: (path = '') => {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://friday.app'
    return path ? `${base}/${String(path).replace(/^\/+/, '')}` : base
  },
  links: {
    privacy: 'https://friday.app/privacy',
    support: 'https://friday.app/support',
    changelog: 'https://friday.app/changelog',
  },
})

/** Breakpoints from docs/07_design_system.md -> Responsive Behaviour. */
export const BREAKPOINTS = Object.freeze({
  tablet: 768,
  desktop: 1280,
})

/** Settings sections (Phase 2 adds integrations; Phase 1 ships these). */
export const SETTINGS_SECTIONS = Object.freeze([
  { key: 'profile', label: 'Profile', icon: 'UserCircle' },
  { key: 'notifications', label: 'Notifications', icon: 'Bell' },
  { key: 'capture', label: 'Editor & Shortcuts', icon: 'PencilSimpleLine' },
  { key: 'threads', label: 'Threads & attention', icon: 'ChatCircleDots' },
  { key: 'appearance', label: 'Appearance', icon: 'PaintBrush' },
  { key: 'data', label: 'Data & privacy', icon: 'ShieldCheck' },
  { key: 'about', label: 'About', icon: 'Info' },
])

/** Search result groups (Feature 12 -> categorised results). */
export const SEARCH_GROUPS = Object.freeze([
  { key: 'threads', label: 'Threads' },
  { key: 'people', label: 'People' },
  { key: 'captures', label: 'Captures' },
  { key: 'commitments', label: 'Commitments' },
])
