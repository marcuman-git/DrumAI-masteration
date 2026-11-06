import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Music, Pause, Play, Upload } from 'lucide-react'
import {
  applyAudioSettings,
  attachLoopHandler,
  playWithCountIn,
  type PlaybackSettings,
  type SongTrack,
} from '../../core/services/audio/songPracticeEngine'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { SongChartEditor } from './SongChartEditor'

export function SongPracticeView() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const detachLoopRef = useRef<null | (() => void)>(null)
  const countInRef = useRef<AbortController | null>(null)
  const urlsRef = useRef(new Set<string>())
  const [mode, setMode] = useState<'chart' | 'audio'>('chart')
  const [isCountingIn, setIsCountingIn] = useState(false)
  const [audioMessage, setAudioMessage] = useState('Audio uploads are available for this visit only. Reloading requires choosing the audio files again.')

  const [tracks, setTracks] = useState<SongTrack[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [countInBeats, setCountInBeats] = useState(4)
  const [countInBpm, setCountInBpm] = useState(60)

  const [settings, setSettings] = useState<PlaybackSettings>({
    tempoRate: 1,
    preservePitch: true,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 10,
  })

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId],
  )

  useEffect(() => () => {
    countInRef.current?.abort()
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    applyAudioSettings(audio, settings)
    detachLoopRef.current?.()
    detachLoopRef.current = attachLoopHandler(audio, settings)

    return () => {
      detachLoopRef.current?.()
      detachLoopRef.current = null
    }
  }, [settings, selectedTrackId, mode])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    pausePlayback()
    const url = URL.createObjectURL(file)
    urlsRef.current.add(url)
    event.target.value = ''
    const track: SongTrack = {
      id: crypto.randomUUID(),
      name: file.name,
      fileUrl: url,
    }

    setTracks((value) => [track, ...value])
    setSelectedTrackId(track.id)
    setIsPlaying(false)
  }

  async function startPlayback() {
    const audio = audioRef.current
    if (!audio || !selectedTrack) return

    if (settings.loopEnabled) {
      audio.currentTime = settings.loopStart
    }

    countInRef.current?.abort()
    const controller = new AbortController()
    countInRef.current = controller
    setIsCountingIn(true)
    try {
      await playWithCountIn(audio, settings, countInBeats, countInBpm, controller.signal)
      if (!controller.signal.aborted) setIsPlaying(true)
    } catch { if (!controller.signal.aborted) setAudioMessage('Audio could not play. Check the file and browser audio permissions.') }
    finally { if (countInRef.current === controller) setIsCountingIn(false) }
  }

  function pausePlayback() {
    countInRef.current?.abort()
    setIsCountingIn(false)
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Song Practice" subtitle="Create editable drum charts, or practice separately with uploaded audio tracks." />
      <div className="flex gap-2">{(['chart', 'audio'] as const).map((value) => <button key={value} aria-pressed={mode === value} onClick={() => { pausePlayback(); setMode(value) }} className={`rounded-lg border px-4 py-2 ${mode === value ? 'border-cyan-200 bg-cyan-300/20' : 'border-white/20'}`}>{value === 'chart' ? 'Drum Chart' : 'Audio Tracks'}</button>)}</div>

      {mode === 'chart' ? <SongChartEditor /> : <><p role="status" className="text-sm text-zinc-300">{audioMessage}</p><div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <GlassCard className="space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-100">
            <Upload size={12} /> Upload Audio
            <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
          </label>

          <div className="grid gap-2">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => { pausePlayback(); setSelectedTrackId(track.id) }}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${track.id === selectedTrackId ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-zinc-300'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Music size={14} /> {track.name}
                </span>
                <span className="text-xs">Drumless-ready</span>
              </button>
            ))}
          </div>

          {selectedTrack ? (
            <audio
              ref={audioRef}
              src={selectedTrack.fileUrl}
              controls
              className="w-full"
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onEnded={() => setIsPlaying(false)}
              onError={() => setAudioMessage('This audio file could not load. Choose a supported audio file again.')}
            />
          ) : (
            <p className="text-sm text-zinc-400">Add a track to start playlist practice and setlists.</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startPlayback()}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
              disabled={!selectedTrack || isPlaying || isCountingIn}
            >
              <Play size={12} /> {isPlaying ? 'Playing...' : isCountingIn ? 'Counting in...' : 'Count-in + Play'}
            </button>
            <button
              type="button"
              onClick={pausePlayback}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-100"
              disabled={!selectedTrack || (!isPlaying && !isCountingIn)}
            >
              <Pause size={12} /> Pause
            </button>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Playback Controls</p>

          <label className="block text-xs text-zinc-300">
            Tempo Rate {settings.tempoRate.toFixed(2)}x
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={settings.tempoRate}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  tempoRate: Number(event.target.value),
                }))
              }
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.preservePitch}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  preservePitch: event.target.checked,
                }))
              }
              className="accent-cyan-400"
            />
            Preserve pitch
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.loopEnabled}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  loopEnabled: event.target.checked,
                }))
              }
              className="accent-cyan-400"
            />
            Loop section
          </label>

          <label className="block text-xs text-zinc-300">
            Loop Start (s)
            <input
              type="number"
              min={0}
              value={settings.loopStart}
              onChange={(event) => setSettings((value) => ({ ...value, loopStart: Number(event.target.value) }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Loop End (s)
            <input
              type="number"
              min={0}
              value={settings.loopEnd}
              onChange={(event) => setSettings((value) => ({ ...value, loopEnd: Number(event.target.value) }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Count-in Beats
            <input
              type="number"
              min={1}
              max={8}
              value={countInBeats}
              onChange={(event) => setCountInBeats(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Count-in BPM
            <input
              type="number"
              min={40}
              max={240}
              value={countInBpm}
              onChange={(event) => setCountInBpm(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            />
          </label>
        </GlassCard>
      </div></>}
    </div>
  )
}
