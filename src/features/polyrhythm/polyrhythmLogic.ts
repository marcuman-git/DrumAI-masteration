export const RATIOS = [[2, 3], [3, 4], [4, 5], [5, 7], [7, 8], [9, 4]] as const
export type Ratio = readonly [number, number]
export function buildPolyrhythm(ratio: Ratio) {
  let a = ratio[0]; let b = ratio[1]
  while (b) { const remainder = a % b; a = b; b = remainder }
  const total = ratio[0] * ratio[1] / a
  return { total, first: Array.from({ length: total }, (_, index) => index % (total / ratio[0]) === 0), second: Array.from({ length: total }, (_, index) => index % (total / ratio[1]) === 0) }
}
export function cycleSeconds(bpm: number): number { return 240 / bpm }
