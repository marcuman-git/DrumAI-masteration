import { useMemo, useState } from 'react'
import { saveUserProfile } from '../../core/services/storage/userProfile'
import type { ExperienceLevel, UserProfile } from '../../core/types/drumming'

const styleOptions = ['Rock', 'Funk', 'Jazz', 'Latin', 'Metal', 'Gospel', 'Fusion', 'Progressive']
const goalOptions = ['Improve timing', 'Build speed', 'Better coordination', 'Reading fluency', 'Groove pocket', 'Live performance']
const setupOptions: UserProfile['drumSetup'][] = ['Acoustic Kit', 'Electronic Kit', 'Practice Pad', 'Hybrid']

interface OnboardingModalProps {
  open: boolean
  initialProfile?: UserProfile | null
  onClose: () => void
  onSaved: (profile: UserProfile) => void
}

function toggleItem(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

export function OnboardingModal({ open, initialProfile, onClose, onSaved }: OnboardingModalProps) {
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(initialProfile?.experienceLevel ?? 'Beginner')
  const [styles, setStyles] = useState<string[]>(initialProfile?.styles ?? ['Rock'])
  const [goals, setGoals] = useState<string[]>(initialProfile?.goals ?? ['Improve timing'])
  const [dailyMinutes, setDailyMinutes] = useState(initialProfile?.dailyMinutes ?? 30)
  const [drumSetup, setDrumSetup] = useState<UserProfile['drumSetup']>(initialProfile?.drumSetup ?? 'Practice Pad')
  const [hasMidiDevice, setHasMidiDevice] = useState(initialProfile?.hasMidiDevice ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = useMemo(() => styles.length > 0 && goals.length > 0 && dailyMinutes >= 10, [styles, goals, dailyMinutes])

  if (!open) return null

  async function handleSave() {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const profile: UserProfile = {
        id: initialProfile?.id ?? crypto.randomUUID(),
        createdAt: initialProfile?.createdAt ?? now,
        updatedAt: now,
        experienceLevel,
        styles,
        goals,
        dailyMinutes,
        drumSetup,
        hasMidiDevice,
      }
      await saveUserProfile(profile)
      onSaved(profile)
      onClose()
    } catch {
      setError('Unable to save profile right now. Please retry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-zinc-100">Onboarding + Profile Setup</h3>
          <p className="text-sm text-zinc-400">Tell DrumMaster AI how you play, what you want to improve, and how much time you have.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-zinc-300">
            Experience Level
            <select
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Professional">Professional</option>
            </select>
          </label>

          <label className="text-xs text-zinc-300">
            Daily Practice Time: {dailyMinutes} minutes
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={dailyMinutes}
              onChange={(event) => setDailyMinutes(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="text-xs text-zinc-300">
            Drum Setup
            <select
              value={drumSetup}
              onChange={(event) => setDrumSetup(event.target.value as UserProfile['drumSetup'])}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              {setupOptions.map((setup) => (
                <option key={setup} value={setup}>
                  {setup}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={hasMidiDevice}
              onChange={(event) => setHasMidiDevice(event.target.checked)}
              className="accent-cyan-400"
            />
            I have a MIDI-enabled drum device
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Preferred Styles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {styleOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStyles((current) => toggleItem(current, style))}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    styles.includes(style)
                      ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                      : 'border-white/10 text-zinc-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Primary Goals</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {goalOptions.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setGoals((current) => toggleItem(current, goal))}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    goals.includes(goal)
                      ? 'border-violet-300/50 bg-violet-300/15 text-violet-100'
                      : 'border-white/10 text-zinc-300'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || isSaving}
            className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
