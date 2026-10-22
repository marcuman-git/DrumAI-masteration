import { useMemo, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const basePatterns = ['RLRL', 'RRLL', 'RLLR', 'RLRR', 'LLRL']

function randomPattern(length: number): string {
  return Array.from({ length }, () => (Math.random() > 0.5 ? 'R' : 'L')).join('')
}

export function StickControlView() {
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate')
  const [seed, setSeed] = useState(0)

  const generated = useMemo(() => {
    const sizeByDifficulty = {
      Beginner: 4,
      Intermediate: 8,
      Advanced: 12,
      Expert: 16,
    } as const

    return [
      ...basePatterns,
      randomPattern(sizeByDifficulty[difficulty]),
      randomPattern(sizeByDifficulty[difficulty]),
      randomPattern(sizeByDifficulty[difficulty]),
    ]
  }, [difficulty, seed])

  return (
    <div className="space-y-4">
      <SectionHeader title="Stick Control Trainer" subtitle="Unlimited sticking generation with accents, hand lead, and dynamics." />

      <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr]">
        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Generated Patterns</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {generated.map((pattern, index) => (
              <div key={`${pattern}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-mono text-xl tracking-[0.3em] text-cyan-100">{pattern}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Variation Settings</p>
          {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${difficulty === level ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
            >
              {level}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Accent variations
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Hand lead variation
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Dynamic variation
          </label>
          <button
            type="button"
            onClick={() => setSeed((value) => value + 1)}
            className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            Regenerate
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
