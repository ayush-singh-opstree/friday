import { Monitor, Moon, Sun } from '@/components/icons'
import { IconButton } from '@/components/ui'
import { useTheme } from '@/context'

const ORDER = ['system', 'light', 'dark']

const META = {
  system: { icon: Monitor, label: 'Theme: System' },
  light: { icon: Sun, label: 'Theme: Light' },
  dark: { icon: Moon, label: 'Theme: Dark' },
}

/**
 * Compact theme control for the popup and side-panel headers.
 *
 * One click cycles System -> Light -> Dark -> System, so the surface can be
 * switched without opening the options page. State lives in `settingsStore`
 * (`theme`) and is applied by `ThemeProvider`.
 */
export function ThemeToggle({ size = 'sm' }) {
  const { theme, setTheme } = useTheme()
  const meta = META[theme] ?? META.system
  const Icon = meta.icon
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]

  return (
    <IconButton
      label={`${meta.label} — click for ${next}`}
      size={size}
      onClick={() => setTheme(next)}
    >
      <Icon size={15} />
    </IconButton>
  )
}
