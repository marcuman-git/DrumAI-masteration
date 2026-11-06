export const PAD_ROUTINES = [
  { id: 'tech', name: 'Technique Control', target: 'Even strokes and relaxed rebound', sticking: ['R', 'L', 'R', 'L'], advice: 'Match stroke height. Let the stick rebound; stop if you feel pain or tension.' },
  { id: 'rudi', name: 'Rudiment Focus', target: 'Paradiddle control: R L R R L R L L', sticking: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'], advice: 'Keep doubles relaxed and even. Aim for clean sticking before raising tempo.' },
  { id: 'speed', name: 'Speed Builder', target: 'Relaxed alternating-hand endurance', sticking: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'], advice: 'Choose a comfortable tempo. Reduce BPM if your grip tightens; this mode does not measure maximum speed.' },
  { id: 'dynamic', name: 'Dynamic Control', target: 'Accent every fourth stroke; keep the others soft', sticking: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'], advice: 'Use higher strokes for accents, low strokes for the softer notes. Keep the underlying pulse even.' },
] as const
export function padCue(routineId: string, index: number, leftLead: boolean) {
  const routine = PAD_ROUTINES.find((item) => item.id === routineId) ?? PAD_ROUTINES[0]
  const position = index % routine.sticking.length
  const hand = routine.sticking[position]
  return { hand: leftLead ? hand === 'R' ? 'L' : 'R' : hand, position, accent: routine.id === 'dynamic' && index % 4 === 0 }
}
export function padStepSeconds(bpm: number, subdivision: number): number { return 60 / bpm / subdivision }
export function formatRemaining(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
