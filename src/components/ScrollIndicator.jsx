/**
 * ScrollIndicator.jsx
 * Animated downward scroll cue — bouncing chevron inside a frosted pill.
 */

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.38)',
          fontFamily: 'var(--font-logo)',
          fontWeight: 600,
        }}
      >
        Scroll to explore
      </span>

      {/* Frosted pill button */}
      <motion.button
        aria-label="Scroll to next section"
        className="flex items-center justify-center rounded-full"
        style={{
          width: 44,
          height: 44,
          background: 'rgba(24, 30, 42, 0.70)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer',
        }}
        animate={{ y: [0, 6, 0] }}
        transition={{
          repeat: Infinity,
          duration: 2.0,
          ease: 'easeInOut',
        }}
        onClick={() => {
          window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
        }}
      >
        <ChevronDown size={18} color="rgba(255,255,255,0.7)" />
      </motion.button>
    </motion.div>
  )
}
