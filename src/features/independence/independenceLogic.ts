export const LIMBS = ['RH', 'LH', 'RF', 'LF'] as const
export type Limb = typeof LIMBS[number]
export type LimbGrid = Record<Limb, boolean[]>
export const LIMB_LABELS: Record<Limb, string> = { RH: 'Right Hand - Hi-hat / Ride', LH: 'Left Hand - Snare', RF: 'Right Foot - Kick', LF: 'Left Foot - Pedal hi-hat' }
export const LIMB_PATTERNS: Record<Limb, string[]> = {
  RH: ['8ths', '16ths', 'Ride Swing', 'Bell Pattern'], LH: ['Backbeat', 'Offbeats', 'Ghost Grid', 'Comping'],
  RF: ['Quarters', '8ths', 'Sync Kicks', 'Double Pulse'], LF: ['2&4 Hat', 'Offbeat Hat', 'Clave', 'Samba Ostinato'],
}
const steps: Record<string, number[]> = {
  '8ths': [0, 2, 4, 6, 8, 10, 12, 14], '16ths': Array.from({ length: 16 }, (_, index) => index),
  'Ride Swing': [0, 4, 6, 8, 12, 14], 'Bell Pattern': [0, 2, 5, 6, 8, 10, 13, 14],
  Backbeat: [4, 12], Offbeats: [2, 6, 10, 14], 'Ghost Grid': [3, 4, 7, 10, 12, 15], Comping: [4, 10, 14],
  Quarters: [0, 4, 8, 12], 'Sync Kicks': [0, 6, 8, 11], 'Double Pulse': [0, 1, 4, 5, 8, 9, 12, 13],
  '2&4 Hat': [4, 12], 'Offbeat Hat': [2, 6, 10, 14], Clave: [0, 3, 6, 10, 12], 'Samba Ostinato': [0, 3, 4, 7, 8, 11, 12, 15],
}
export const STYLE_PRESETS = {
  Rock: { RH: '8ths', LH: 'Backbeat', RF: 'Quarters', LF: '2&4 Hat' },
  Jazz: { RH: 'Ride Swing', LH: 'Comping', RF: 'Sync Kicks', LF: 'Offbeat Hat' },
  Latin: { RH: '16ths', LH: 'Offbeats', RF: 'Quarters', LF: 'Clave' },
  Fusion: { RH: '16ths', LH: 'Ghost Grid', RF: 'Sync Kicks', LF: 'Samba Ostinato' },
  Gospel: { RH: 'Bell Pattern', LH: 'Ghost Grid', RF: 'Double Pulse', LF: 'Offbeat Hat' },
} as const
export type Style = keyof typeof STYLE_PRESETS
export function patternSteps(name: string): boolean[] { return Array.from({ length: 16 }, (_, index) => (steps[name] ?? []).includes(index)) }
export function presetGrid(style: Style): LimbGrid { return Object.fromEntries(LIMBS.map((limb) => [limb, patternSteps(STYLE_PRESETS[style][limb])])) as LimbGrid }
export function toggleStep(grid: LimbGrid, limb: Limb, index: number): LimbGrid {
  return { ...grid, [limb]: grid[limb].map((active, step) => step === index ? !active : active) }
}
export function stepDuration(bpm: number, step: number, swing: boolean): number {
  return 60 / bpm / 4 * (swing ? (step % 4 < 2 ? 4 / 3 : 2 / 3) : 1)
}
export interface SavedCoordination { grid: LimbGrid; bpm: number; swing: boolean; profile?: Record<Limb, string> }
export function isCoordination(value: unknown): value is SavedCoordination {
  if (!value || typeof value !== 'object') return false
  const parsed = value as SavedCoordination
  return Number.isFinite(parsed.bpm) && parsed.bpm >= 40 && parsed.bpm <= 240 && typeof parsed.swing === 'boolean'
    && LIMBS.every((limb) => Array.isArray(parsed.grid?.[limb]) && parsed.grid[limb].length === 16 && parsed.grid[limb].every((step) => typeof step === 'boolean'))
    && (!parsed.profile || LIMBS.every((limb) => parsed.profile?.[limb] === 'Custom' || LIMB_PATTERNS[limb].includes(parsed.profile?.[limb] ?? '')))
}
export function loadCoordination(): SavedCoordination | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('drummaster-independence-v1') ?? 'null') as SavedCoordination | null
    return isCoordination(parsed) ? parsed : null
  } catch { return null }
}
