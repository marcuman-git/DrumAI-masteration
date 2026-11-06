export type GrooveInstrument = 'Hi-hat' | 'Snare' | 'Kick' | 'Ride' | 'Shell'
export interface GrooveItem {
  id: string; style: string; title: string; notes: string; bpmRange: string; focus: string
  meter: string; steps: number; swing: boolean; rows: Partial<Record<GrooveInstrument, number[]>>
}
function row(steps: number, hits: number[], ghosts: number[] = []): number[] {
  return Array.from({ length: steps }, (_, index) => hits.includes(index) ? 2 : ghosts.includes(index) ? 1 : 0)
}
const eighths = [0, 2, 4, 6, 8, 10, 12, 14]
export const GROOVES: GrooveItem[] = [
  { id: 'r1', style: 'Rock', title: 'Basic Rock Pocket', notes: 'Kick on 1 and 3, snare on 2 and 4, eighth-note hi-hat.', bpmRange: '70-130', focus: 'Solid pulse', meter: '4/4', steps: 16, swing: false, rows: { 'Hi-hat': row(16, eighths), Snare: row(16, [4, 12]), Kick: row(16, [0, 8]) } },
  { id: 'f1', style: 'Funk', title: 'Ghost Grid Funk', notes: 'Backbeats, softer snare ghost notes, and syncopated kicks.', bpmRange: '80-115', focus: 'Dynamic control', meter: '4/4', steps: 16, swing: false, rows: { 'Hi-hat': row(16, eighths), Snare: row(16, [4, 12], [3, 7, 10, 15]), Kick: row(16, [0, 3, 6, 10]) } },
  { id: 'j1', style: 'Jazz', title: 'Ride Comping Core', notes: 'Swung ride pattern, sparse snare comping, and soft bass drum.', bpmRange: '120-220', focus: 'Comping flow', meter: '4/4', steps: 16, swing: true, rows: { Ride: row(16, [0, 4, 6, 8, 12, 14]), Snare: row(16, [4, 10, 14]), Kick: row(16, [], [0, 8]) } },
  { id: 'l1', style: 'Latin', title: 'Songo Starter', notes: 'Songo-inspired shell, snare, and kick coordination. Simplified one-bar study, not a full traditional transcription.', bpmRange: '90-130', focus: 'Coordination', meter: '4/4', steps: 16, swing: false, rows: { Shell: row(16, [0, 2, 5, 6, 8, 10, 13, 14]), Snare: row(16, [4, 11]), Kick: row(16, [0, 7, 8, 14]) } },
  { id: 'm1', style: 'Metal', title: 'Double Bass Engine', notes: 'Continuous sixteenth-note bass drum under a hi-hat and backbeat.', bpmRange: '140-220', focus: 'Foot endurance', meter: '4/4', steps: 16, swing: false, rows: { 'Hi-hat': row(16, eighths), Snare: row(16, [4, 12]), Kick: row(16, Array.from({ length: 16 }, (_, index) => index)) } },
  { id: 'p1', style: 'Progressive', title: '7/8 Linear Grid', notes: 'Seven eighth-note pulses: one instrument at a time, grouped 2 + 2 + 3.', bpmRange: '90-160', focus: 'Odd-time phrasing', meter: '7/8', steps: 14, swing: false, rows: { 'Hi-hat': row(14, [2, 6, 12]), Snare: row(14, [4, 10]), Kick: row(14, [0, 8]) } },
]
export function grooveStepSeconds(bpm: number, step: number, swing: boolean): number {
  return 60 / bpm / 4 * (swing ? (step % 4 < 2 ? 4 / 3 : 2 / 3) : 1)
}
export function grooveCount(groove: GrooveItem, step: number): string {
  if (groove.meter === '7/8') return step % 2 === 0 ? String(step / 2 + 1) : '+'
  return step % 4 === 0 ? String(step / 4 + 1) : ['e', '&', 'a'][step % 4 - 1]
}
export function loadGroovePlaylist(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('drummaster-groove-playlist-v1') ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && GROOVES.some((groove) => groove.id === id)))] : []
  } catch { return [] }
}
