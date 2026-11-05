export type Accent = 'None' | 'First Stroke' | 'Every Fourth' | 'Right Hand' | 'Left Hand'
export type Dynamic = 'Soft' | 'Medium' | 'Loud' | 'Crescendo'
export interface SavedSticking { id: string; name: string; pattern: string; lead: 'R' | 'L'; accent: Accent; dynamic: Dynamic; tempo: number }
export function leadPattern(pattern: string, lead: 'R' | 'L'): string {
  return pattern[0] === lead ? pattern : pattern.replace(/[RL]/g, (hand) => hand === 'R' ? 'L' : 'R')
}
export function strokeVolume(pattern: string, index: number, accent: Accent, dynamic: Dynamic): number {
  const accented = accent === 'First Stroke' ? index === 0 : accent === 'Every Fourth' ? index % 4 === 0 : accent === 'Right Hand' ? pattern[index] === 'R' : accent === 'Left Hand' ? pattern[index] === 'L' : false
  const level = dynamic === 'Soft' ? 0.1 : dynamic === 'Loud' ? 0.4 : dynamic === 'Crescendo' ? 0.08 + 0.32 * index / Math.max(1, pattern.length - 1) : 0.22
  return Math.min(0.8, level * (accented ? 1.8 : 1))
}
export function loadStickings(): SavedSticking[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem('drummaster-stickings-v1') ?? '[]')
    if (!Array.isArray(items)) return []
    return items.filter((item): item is SavedSticking => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.pattern === 'string' && /^[RL]{1,32}$/.test(item.pattern) && ['R','L'].includes(item.lead) && ['None','First Stroke','Every Fourth','Right Hand','Left Hand'].includes(item.accent) && ['Soft','Medium','Loud','Crescendo'].includes(item.dynamic) && Number.isFinite(item.tempo) && item.tempo >= 40 && item.tempo <= 240))
  } catch { return [] }
}
