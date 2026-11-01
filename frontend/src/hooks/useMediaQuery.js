import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reactive CSS media query, built on `useSyncExternalStore` so it subscribes to
 * the platform instead of mirroring state inside an effect.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * Layout breakpoints from docs/07_design_system.md -> Responsive Behaviour:
 *   mobile (0)  -> single column + bottom tab bar
 *   tablet (768)-> two columns (list + detail)
 *   desktop (1280) -> three columns (nav + list + detail)
 */
export function useBreakpoint() {
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  const isTablet = useMediaQuery('(min-width: 768px)')
  return {
    isDesktop,
    isTablet,
    isMobile: !isTablet,
    layout: isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile',
  }
}