import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../utils/cn'

interface GlassCardProps extends PropsWithChildren {
  className?: string
}

export function GlassCard({ className, children }: GlassCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'rounded-2xl border border-white/10 bg-white/6 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </motion.article>
  )
}
