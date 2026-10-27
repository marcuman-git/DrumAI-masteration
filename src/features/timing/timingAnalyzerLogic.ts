export type Hand = 'L' | 'R'

export const timingDrillPatterns = {
  'Singles (L/R)': ['L', 'R'],
  'Singles (R/L)': ['R', 'L'],
  'Doubles (L/R)': ['L', 'L', 'R', 'R'],
  'Doubles (R/L)': ['R', 'R', 'L', 'L'],
  'Paradiddle (L/R)': ['L', 'R', 'L', 'L', 'R', 'L', 'R', 'R'],
  'Paradiddle (R/L)': ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'],
} as const satisfies Record<string, readonly Hand[]>

export type DrillMode = keyof typeof timingDrillPatterns

export function handForExpectedIndex(pattern: readonly Hand[], expectedIndex: number): Hand {
  if (!pattern.length) return 'L'
  const wrapped = ((expectedIndex % pattern.length) + pattern.length) % pattern.length
  return pattern[wrapped]
}
