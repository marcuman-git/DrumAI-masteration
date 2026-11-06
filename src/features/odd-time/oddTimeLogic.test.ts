import { describe, expect, it } from 'vitest'
import { GROUPINGS, groupingRows, groupingStarts, meterParts, METERS, oddPattern, unitSeconds } from './oddTimeLogic'
describe('odd meter grouping', () => {
  it('splits /16 groups into two rows without losing indices or units', () => {
    for (const meter of ['13/16', '15/16'] as const) for (const grouping of GROUPINGS[meter]) {
      const rows = groupingRows(meter, grouping)
      expect(rows).toHaveLength(2)
      expect(rows.flat().map((item) => item.group)).toEqual(grouping.map((_, index) => index))
      expect(rows.flat().reduce((sum, item) => sum + item.length, 0)).toBe(meterParts(meter).units)
    }
  })
  it('preserves the complete meter for all available groupings', () => {
    for (const meter of METERS) for (const grouping of GROUPINGS[meter]) {
      expect(grouping.reduce((sum, value) => sum + value, 0)).toBe(meterParts(meter).units)
      expect(oddPattern(meter, grouping, 'Groove')).toHaveLength(meterParts(meter).units)
      expect(oddPattern(meter, grouping, 'Click').filter((step) => step.accent)).toHaveLength(grouping.length)
    }
    expect(groupingStarts([2, 2, 3])).toEqual([0, 2, 4])
  })
  it('uses quarter-note BPM consistently across denominators', () => {
    expect(unitSeconds('5/4', 60) * 5).toBe(5)
    expect(unitSeconds('7/8', 60) * 7).toBe(3.5)
    expect(unitSeconds('13/16', 60) * 13).toBe(3.25)
    expect(unitSeconds('15/16', 120) * 15).toBe(1.875)
  })
})
