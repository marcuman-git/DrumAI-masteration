import { motion } from 'framer-motion'
import { useAppStore } from '../../core/store/useAppStore'
import { cn } from '../../shared/utils/cn'
import { MODULES } from './modules'

export function ModuleNav() {
  const activeModule = useAppStore((state) => state.activeModule)
  const setActiveModule = useAppStore((state) => state.setActiveModule)

  return (
    <nav className="rounded-2xl border border-white/10 bg-black/35 p-2 backdrop-blur">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        {MODULES.map((module) => {
          const active = activeModule === module.id
          return (
            <li key={module.id}>
              <button
                type="button"
                onClick={() => setActiveModule(module.id)}
                className={cn(
                  'relative w-full overflow-hidden rounded-xl px-3 py-2 text-left text-xs transition-colors',
                  active ? 'text-cyan-100' : 'text-zinc-300 hover:text-zinc-50',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="active-module-pill"
                    className="absolute inset-0 rounded-xl bg-cyan-500/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                ) : null}
                <span className="relative block font-medium">{module.label}</span>
                <span className="relative mt-1 block text-[10px] uppercase tracking-wide text-zinc-400">
                  {module.category}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
