import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const rudiments = {
  Singles: ['Single Stroke Roll', 'Single Stroke Four', 'Single Stroke Seven'],
  Doubles: ['Double Stroke Roll', 'Five Stroke Roll', 'Nine Stroke Roll'],
  Paradiddles: ['Single Paradiddle', 'Double Paradiddle', 'Paradiddle-Diddle'],
  Flams: ['Flam', 'Flam Accent', 'Flamacue'],
  Drags: ['Drag', 'Single Drag Tap', 'Double Drag Tap'],
  Ratamacues: ['Single Ratamacue', 'Double Ratamacue', 'Triple Ratamacue'],
}

const stickingExamples = ['R L R R L R L L', 'R L R L R R L L', 'R R L R L L R L']

export function RudimentTrainerView() {
  const [category, setCategory] = useState<keyof typeof rudiments>('Paradiddles')
  const [mode, setMode] = useState<'Learn' | 'Practice' | 'Challenge' | 'Mastery'>('Practice')

  const pattern = useMemo(
    () => stickingExamples[Math.floor(Math.random() * stickingExamples.length)],
    [category, mode],
  )

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rudiment Trainer"
        subtitle="All PAS categories with learn, practice, challenge, and mastery workflows."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(rudiments).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key as keyof typeof rudiments)}
                className={`rounded-lg px-3 py-2 text-xs ${category === key ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {rudiments[category].map((name) => (
              <div key={name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium text-zinc-100">{name}</p>
                <p className="text-xs text-zinc-400">Tempo progression + audio demo + sticking animation</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-100">Animated Sticking Display</p>
            <p className="mt-2 text-3xl font-semibold tracking-[0.35em] text-zinc-50">{pattern}</p>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <SectionHeader title="Modes" />
          {(['Learn', 'Practice', 'Challenge', 'Mastery'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${mode === item ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : 'border-white/10 text-zinc-300'}`}
            >
              {item} mode
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            <Shuffle size={14} /> Randomized Practice
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
