import { useMemo, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const limbPatterns = {
  RH: ['8ths', '16ths', 'Ride Swing', 'Bell Pattern'],
  LH: ['Backbeat', 'Offbeats', 'Ghost Grid', 'Comping'],
  RF: ['Quarters', '8ths', 'Sync Kicks', 'Double Pulse'],
  LF: ['2&4 Hat', 'Offbeat Hat', 'Clave', 'Samba Ostinato'],
} as const

const stylePresets = {
  Rock: { RH: '8ths', LH: 'Backbeat', RF: 'Quarters', LF: '2&4 Hat' },
  Jazz: { RH: 'Ride Swing', LH: 'Comping', RF: 'Sync Kicks', LF: 'Offbeat Hat' },
  Latin: { RH: '16ths', LH: 'Offbeats', RF: 'Quarters', LF: 'Clave' },
  Fusion: { RH: '16ths', LH: 'Ghost Grid', RF: 'Sync Kicks', LF: 'Samba Ostinato' },
  Gospel: { RH: 'Bell Pattern', LH: 'Ghost Grid', RF: 'Double Pulse', LF: 'Offbeat Hat' },
} as const

type LimbKey = keyof typeof limbPatterns

type Profile = {
  RH: string
  LH: string
  RF: string
  LF: string
}

export function IndependenceTrainerView() {
  const [profile, setProfile] = useState<Profile>({
    RH: '8ths',
    LH: 'Offbeats',
    RF: 'Quarters',
    LF: 'Clave',
  })
  const [bpm, setBpm] = useState(60)

  const complexityScore = useMemo(() => {
    const complexityMap: Record<string, number> = {
      '8ths': 1,
      '16ths': 2,
      'Ride Swing': 2,
      'Bell Pattern': 3,
      Backbeat: 1,
      Offbeats: 2,
      'Ghost Grid': 3,
      Comping: 3,
      Quarters: 1,
      'Sync Kicks': 3,
      'Double Pulse': 4,
      '2&4 Hat': 1,
      'Offbeat Hat': 2,
      Clave: 3,
      'Samba Ostinato': 4,
    }

    const sum = Object.values(profile).reduce((acc, value) => acc + (complexityMap[value] ?? 1), 0)
    return Math.min(100, Math.round((sum / 16) * 100))
  }, [profile])

  function setLimbPattern(limb: LimbKey, value: string) {
    setProfile((current) => ({ ...current, [limb]: value }))
  }

  function applyPreset(preset: keyof typeof stylePresets) {
    setProfile(stylePresets[preset])
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Independence Trainer"
        subtitle="Interactive 4-limb coordination matrix with style presets and custom limb assignment."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Coordination Matrix</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(Object.keys(limbPatterns) as LimbKey[]).map((limb) => (
              <div key={limb} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-cyan-100">{limb}</p>
                <select
                  value={profile[limb]}
                  onChange={(event) => setLimbPattern(limb, event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
                >
                  {limbPatterns[limb].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-100">Current Split</p>
            <p className="mt-1 text-sm text-zinc-100">RH: {profile.RH} | LH: {profile.LH}</p>
            <p className="text-sm text-zinc-100">RF: {profile.RF} | LF: {profile.LF}</p>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Session Setup</p>

          <label className="block text-xs text-zinc-300">
            Tempo {bpm} BPM
            <input
              type="range"
              min={40}
              max={180}
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(stylePresets) as Array<keyof typeof stylePresets>).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-violet-300/25 bg-violet-300/10 p-3">
            <p className="text-xs uppercase tracking-wide text-violet-100">Complexity Meter</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{complexityScore}%</p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
