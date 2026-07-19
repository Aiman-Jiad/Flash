import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function Splash({ onDone }: { onDone: () => void }) {
  const [hide, setHide] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1700)
    const t2 = setTimeout(onDone, 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-black dark:to-neutral-950"
      animate={{ opacity: hide ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-accent-400 via-accent-500 to-accent-700 flex items-center justify-center shadow-2xl shadow-accent-500/40">
            <svg viewBox="0 0 64 64" className="w-14 h-14">
              <motion.path
                d="M34 12 L20 36 H30 L28 52 L44 26 H34 Z"
                fill="white"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
          </div>
          <motion.div
            className="absolute inset-0 rounded-[28px] border-2 border-accent-400"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        </motion.div>
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <div className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Flash</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 tracking-widest uppercase">Share your moments</div>
        </motion.div>
      </div>
    </motion.div>
  )
}
