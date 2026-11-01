import { createContext, useContext, useEffect, useMemo } from 'react'
import { DEFAULT_SETTINGS } from '@/config/constants'
import { useSettingsStore } from '@/store'

const ThemeContext = createContext(null)

/**
 * ThemeProvider - switches between `system`, `light` and `dark`.
 *
 * Colours come from CSS custom properties, so applying the `dark` class to the
 * host element is enough for both the extension pages (documentElement) and the
 * shadow-DOM companion (whose host element inherits custom properties into the
 * shadow tree).
 *
 * @param {{ children: React.ReactNode, container?: { current: HTMLElement | null } }} props
 */
export function ThemeProvider({ children, container }) {
  const theme = useSettingsStore((state) => state.settings.theme)

  useEffect(() => {
    const element =
      container?.current ?? (typeof document !== 'undefined' ? document.documentElement : null)
    if (!element) return

    element.classList.remove('dark', 'light')
    if (theme === 'dark') element.classList.add('dark')
    else if (theme === 'light') element.classList.add('light')
  }, [theme, container])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next) => useSettingsStore.getState().update({ theme: next }),
      options: ['system', 'light', 'dark'],
      isSystem: (theme ?? DEFAULT_SETTINGS.theme) === 'system',
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.')
  return context
}
