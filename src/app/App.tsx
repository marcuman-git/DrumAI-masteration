import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Drum, Download, PlugZap } from 'lucide-react'
import { MODULE_CONTENT } from '../features/library/catalog'
import { ModuleGridView } from '../features/library/ModuleGridView'
import { ModuleNav } from '../features/shell/ModuleNav'
import { registerPlugin } from '../core/services/plugins/pluginRegistry'
import { useAppStore } from '../core/store/useAppStore'
import type { TrainingModuleId } from '../core/types/drumming'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

const DashboardView = lazy(() =>
  import('../features/dashboard/DashboardView').then((module) => ({ default: module.DashboardView })),
)
const MetronomeView = lazy(() =>
  import('../features/metronome/MetronomeView').then((module) => ({ default: module.MetronomeView })),
)
const TimingAnalyzerView = lazy(() =>
  import('../features/timing/TimingAnalyzerView').then((module) => ({ default: module.TimingAnalyzerView })),
)
const RudimentTrainerView = lazy(() =>
  import('../features/rudiments/RudimentTrainerView').then((module) => ({ default: module.RudimentTrainerView })),
)
const StickControlView = lazy(() =>
  import('../features/stick-control/StickControlView').then((module) => ({ default: module.StickControlView })),
)
const RhythmReadingView = lazy(() =>
  import('../features/reading/RhythmReadingView').then((module) => ({ default: module.RhythmReadingView })),
)
const RhythmDictationView = lazy(() =>
  import('../features/dictation/RhythmDictationView').then((module) => ({ default: module.RhythmDictationView })),
)
const FillGeneratorView = lazy(() =>
  import('../features/fills/FillGeneratorView').then((module) => ({ default: module.FillGeneratorView })),
)
const SongPracticeView = lazy(() =>
  import('../features/song-practice/SongPracticeView').then((module) => ({ default: module.SongPracticeView })),
)
const AICoachView = lazy(() =>
  import('../features/coach/AICoachView').then((module) => ({ default: module.AICoachView })),
)
const AnalyticsView = lazy(() =>
  import('../features/analytics/AnalyticsView').then((module) => ({ default: module.AnalyticsView })),
)
const CommunityView = lazy(() =>
  import('../features/community/CommunityView').then((module) => ({ default: module.CommunityView })),
)

function ModuleLoadingState() {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-8 text-sm text-zinc-300 backdrop-blur">
      Loading module...
    </section>
  )
}

function renderModule(moduleId: TrainingModuleId) {
  switch (moduleId) {
    case 'dashboard':
      return <DashboardView />
    case 'metronome':
      return <MetronomeView />
    case 'timing-analyzer':
      return <TimingAnalyzerView />
    case 'rudiments':
      return <RudimentTrainerView />
    case 'stick-control':
      return <StickControlView />
    case 'reading':
      return <RhythmReadingView />
    case 'dictation':
      return <RhythmDictationView />
    case 'fills':
      return <FillGeneratorView />
    case 'song-practice':
      return <SongPracticeView />
    case 'coach':
      return <AICoachView />
    case 'analytics':
      return <AnalyticsView />
    case 'community':
      return <CommunityView />
    default: {
      const moduleData = MODULE_CONTENT[moduleId as keyof typeof MODULE_CONTENT]
      return moduleData ? (
        <ModuleGridView title={moduleData.title} subtitle={moduleData.subtitle} items={[...moduleData.items]} />
      ) : null
    }
  }
}

export default function App() {
  const activeModule = useAppStore((state) => state.activeModule)
  const hydrate = useAppStore((state) => state.hydrate)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    void hydrate()

    registerPlugin({
      id: 'core-ai-practice-engine',
      name: 'Core AI Practice Engine',
      version: '1.0.0',
      initialize: () => {
        // Plugin initialization hook for future third-party modules.
      },
    })
  }, [hydrate])

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const statusTone = useMemo(
    () => (online ? 'text-emerald-300 border-emerald-300/20' : 'text-amber-300 border-amber-300/20'),
    [online],
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#1f2937_0%,_#09090b_35%,_#030712_100%)] text-zinc-100">
      <div className="mx-auto max-w-[1450px] p-4 md:p-6">
        <header className="mb-4 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200">
                <Drum size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">DrumMaster AI</h1>
                <p className="text-sm text-zinc-400">
                  The definitive AI-powered ecosystem for timing, technique, groove, musicality, and performance.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`rounded-lg border px-3 py-1 text-xs ${statusTone}`}>{online ? 'Online Sync Ready' : 'Offline Mode Active'}</div>
              <div className="rounded-lg border border-violet-300/25 px-3 py-1 text-xs text-violet-100">
                <PlugZap size={12} className="mr-1 inline" />
                MIDI + Audio Analysis
              </div>
              <button
                type="button"
                onClick={() => void installEvent?.prompt()}
                className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
              >
                <Download size={12} className="mr-1 inline" /> Install PWA
              </button>
              <button type="button" className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-200">
                <Bell size={12} className="mr-1 inline" /> Daily Plan
              </button>
            </div>
          </div>
        </header>

        <ModuleNav />

        <motion.main
          key={activeModule}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <Suspense fallback={<ModuleLoadingState />}>{renderModule(activeModule)}</Suspense>
        </motion.main>
      </div>
    </div>
  )
}
