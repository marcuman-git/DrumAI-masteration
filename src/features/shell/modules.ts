import type { TrainingModuleId } from '../../core/types/drumming'

export interface ModuleItem {
  id: TrainingModuleId
  label: string
  category: 'Core' | 'Training' | 'Performance' | 'System'
  practiceOrder?: number
}

export const MODULES: ModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard', category: 'Core' },
  { id: 'metronome', label: 'Smart Metronome', category: 'Core', practiceOrder: 1 },
  { id: 'practice-pad', label: 'Practice Pad', category: 'Performance', practiceOrder: 2 },
  { id: 'timing-analyzer', label: 'Timing Analyzer', category: 'Core', practiceOrder: 3 },
  { id: 'stick-control', label: 'Stick Control', category: 'Training', practiceOrder: 4 },
  { id: 'rudiments', label: 'Rudiment Trainer', category: 'Training', practiceOrder: 5 },
  { id: 'reading', label: 'Rhythm Reading', category: 'Training', practiceOrder: 6 },
  { id: 'groove-library', label: 'Groove Library', category: 'Performance', practiceOrder: 7 },
  { id: 'dynamics', label: 'Dynamics', category: 'Performance', practiceOrder: 8 },
  { id: 'dictation', label: 'Rhythm Dictation', category: 'Training', practiceOrder: 9 },
  { id: 'independence', label: 'Independence', category: 'Training', practiceOrder: 10 },
  { id: 'fills', label: 'Fill Generator', category: 'Performance', practiceOrder: 11 },
  { id: 'song-practice', label: 'Song Practice', category: 'Performance', practiceOrder: 12 },
  { id: 'speed', label: 'Speed', category: 'Performance', practiceOrder: 13 },
  { id: 'odd-time', label: 'Odd Time', category: 'Performance', practiceOrder: 14 },
  { id: 'polyrhythm', label: 'Polyrhythm', category: 'Performance', practiceOrder: 15 },
  { id: 'coach', label: 'AI Coach', category: 'System' },
  { id: 'analytics', label: 'Analytics', category: 'System' },
]
