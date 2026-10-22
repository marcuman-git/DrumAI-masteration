import type { TrainingModuleId } from '../../core/types/drumming'

export interface ModuleItem {
  id: TrainingModuleId
  label: string
  category: 'Core' | 'Training' | 'Performance' | 'System'
}

export const MODULES: ModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard', category: 'Core' },
  { id: 'metronome', label: 'Smart Metronome', category: 'Core' },
  { id: 'timing-analyzer', label: 'Timing Analyzer', category: 'Core' },
  { id: 'rudiments', label: 'Rudiment Trainer', category: 'Training' },
  { id: 'stick-control', label: 'Stick Control', category: 'Training' },
  { id: 'reading', label: 'Rhythm Reading', category: 'Training' },
  { id: 'dictation', label: 'Rhythm Dictation', category: 'Training' },
  { id: 'independence', label: 'Independence', category: 'Training' },
  { id: 'groove-library', label: 'Groove Library', category: 'Performance' },
  { id: 'fills', label: 'Fill Generator', category: 'Performance' },
  { id: 'polyrhythm', label: 'Polyrhythm', category: 'Performance' },
  { id: 'odd-time', label: 'Odd Time', category: 'Performance' },
  { id: 'dynamics', label: 'Dynamics', category: 'Performance' },
  { id: 'speed', label: 'Speed', category: 'Performance' },
  { id: 'practice-pad', label: 'Practice Pad', category: 'Performance' },
  { id: 'song-practice', label: 'Song Practice', category: 'Performance' },
  { id: 'coach', label: 'AI Coach', category: 'System' },
  { id: 'analytics', label: 'Analytics', category: 'System' },
  { id: 'community', label: 'Community', category: 'System' },
]
