import { motion, useReducedMotion } from 'motion/react'

/**
 * List entrance animation (motion / Framer Motion).
 *
 * `StaggerGroup` orchestrates and `StaggerItem` animates each row in, so grids
 * feel alive without any per-page wiring. `as` keeps the real DOM semantics
 * (`ul`/`li` etc.), and everything is skipped for `prefers-reduced-motion`.
 */
const GROUP_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 30 } },
}

export function StaggerGroup({ as = 'div', className, children, ...props }) {
  const MotionTag = motion[as] ?? motion.div
  const reduceMotion = useReducedMotion()

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      animate="show"
      variants={GROUP_VARIANTS}
      {...props}
    >
      {children}
    </MotionTag>
  )
}

export function StaggerItem({ as = 'div', className, children, ...props }) {
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag className={className} variants={ITEM_VARIANTS} {...props}>
      {children}
    </MotionTag>
  )
}
