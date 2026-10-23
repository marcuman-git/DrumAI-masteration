import { useMemo, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const routines = [
  { id: 'tech', name: 'Technique Control', target: 'Even strokes + rebound consistency' },
  { id: 'rudi', name: 'Rudiment Focus', target: 'Paradiddle / doubles / inversion flow' },
  { id: 'speed', name: 'Speed Builder', target: 'Fast hands with relaxed grip' },
  { id: 'dynamic', name: 'Dynamic Control', target: 'Low-high accent ladders' },
]

export function PracticePadModeView() {
  const [routineId, setRoutineId] = useState('tech')
  const [bpm, setBpm] = useState(60)
  const [minutes, setMinutes] = useState(10)

  const routine = useMemo(() => routines.find((item) => item.id === routineId) ?? routines[0], [routineId])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Practice Pad Mode"
        subtitle="Minimal high-contrast interface for focused technique sessions with large visual feedback."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-6 text-center">
            <p className="text-xs uppercase tracking-wide text-cyan-100">Active Routine</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{routine.name}</p>
            <p className="mt-2 text-sm text-zinc-300">{routine.target}</p>
            <p className="mt-6 text-7xl font-bold tracking-tight text-cyan-100">{bpm}</p>
            <p className="text-sm text-zinc-300">BPM</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Session Length</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{minutes} min</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Focus</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">Hands</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Quick Setup</p>

          <label className="block text-xs text-zinc-300">
            Routine
            <select
              value={routineId}
              onChange={(event) => setRoutineId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              {routines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-zinc-300">
            BPM {bpm}
            <input
              type="range"
              min={40}
              max={220}
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Minutes {minutes}
            <input
              type="range"
              min={5}
              max={45}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>
        </GlassCard>
      </div>
    </div>
  )
}
