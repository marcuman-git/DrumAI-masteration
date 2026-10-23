import { useMemo, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const ratios: Array<[number, number]> = [
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 7],
  [7, 8],
  [9, 4],
]

function buildPulse(length: number, total: number): boolean[] {
  return Array.from({ length: total }, (_, index) => index % Math.floor(total / length) === 0)
}

export function PolyrhythmTrainerView() {
  const [ratio, setRatio] = useState<[number, number]>([3, 4])
  const [tempo, setTempo] = useState(60)
  const [viewMode, setViewMode] = useState<'Grid' | 'Circle' | 'Timeline'>('Grid')

  const pulses = useMemo(() => {
    const total = ratio[0] * ratio[1]
    return {
      total,
      left: buildPulse(ratio[0], total),
      right: buildPulse(ratio[1], total),
    }
  }, [ratio])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Polyrhythm Trainer"
        subtitle="Interactive pulse matrix for ratio control, visualization mode, and timeline understanding."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ratios.map((item) => (
              <button
                key={`${item[0]}:${item[1]}`}
                type="button"
                onClick={() => setRatio(item)}
                className={`rounded-lg px-3 py-2 text-xs ${ratio[0] === item[0] && ratio[1] === item[1] ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {item[0]}:{item[1]}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{viewMode} View</p>
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-12 gap-1">
                {pulses.left.slice(0, 12).map((on, index) => (
                  <span key={`l-${index}`} className={`h-6 rounded ${on ? 'bg-cyan-300' : 'bg-zinc-800'}`} />
                ))}
              </div>
              <div className="grid grid-cols-12 gap-1">
                {pulses.right.slice(0, 12).map((on, index) => (
                  <span key={`r-${index}`} className={`h-6 rounded ${on ? 'bg-violet-300' : 'bg-zinc-800'}`} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400">Cyan = first pulse stream | Violet = second pulse stream</p>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Trainer Controls</p>

          <label className="block text-xs text-zinc-300">
            Tempo {tempo} BPM
            <input
              type="range"
              min={40}
              max={180}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            View Mode
            <select
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as 'Grid' | 'Circle' | 'Timeline')}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="Grid">Grid</option>
              <option value="Circle">Circle</option>
              <option value="Timeline">Timeline</option>
            </select>
          </label>

          <p className="text-xs text-zinc-400">Current ratio focus: {ratio[0]}:{ratio[1]}</p>
        </GlassCard>
      </div>
    </div>
  )
}
