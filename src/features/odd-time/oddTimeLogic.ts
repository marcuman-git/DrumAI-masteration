export const METERS = ['5/4', '7/8', '9/8', '11/8', '13/16', '15/16'] as const
export type OddMeter = typeof METERS[number]
export type OddMode = 'Click' | 'Groove' | 'Fill'
export const GROUPINGS: Record<OddMeter, number[][]> = {
  '5/4': [[3, 2], [2, 3]], '7/8': [[2, 2, 3], [3, 2, 2], [2, 3, 2]],
  '9/8': [[2, 2, 2, 3], [3, 3, 3], [3, 2, 2, 2]], '11/8': [[3, 3, 3, 2], [2, 2, 2, 2, 3]],
  '13/16': [[3, 3, 3, 2, 2], [2, 2, 2, 2, 2, 3]], '15/16': [[3, 3, 3, 3, 3], [2, 2, 2, 2, 2, 2, 3]],
}
export function meterParts(meter: OddMeter) { const [units, denominator] = meter.split('/').map(Number); return { units, denominator } }
export function unitSeconds(meter: OddMeter, bpm: number): number { return 60 / bpm * 4 / meterParts(meter).denominator }
export function groupingStarts(grouping: number[]): number[] {
  let position = 0
  return grouping.map((length) => { const start = position; position += length; return start })
}
export function oddPattern(meter: OddMeter, grouping: number[], mode: OddMode) {
  const { units } = meterParts(meter)
  const starts = groupingStarts(grouping)
  return Array.from({ length: units }, (_, index) => ({
    accent: starts.includes(index),
    hand: index % 2 === 0 ? 'R' : 'L',
    kick: mode === 'Groove' && starts.includes(index),
    snare: mode === 'Groove' && !starts.includes(index) && grouping.some((length, group) => index === starts[group] + length - 1),
    hat: mode === 'Groove',
  }))
}
