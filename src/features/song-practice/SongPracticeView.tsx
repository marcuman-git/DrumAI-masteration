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

const PLAYLIST_KEY = 'drummaster-song-playlist-v1'

export function SongPracticeView() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const detachLoopRef = useRef<null | (() => void)>(null)

  const [tracks, setTracks] = useState<SongTrack[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [countInBeats, setCountInBeats] = useState(4)
  const [countInBpm, setCountInBpm] = useState(100)

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

  useEffect(() => {
    const saved = localStorage.getItem(PLAYLIST_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SongTrack[]
      setTracks(parsed)
      setSelectedTrackId(parsed[0]?.id ?? null)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(tracks))
  }, [tracks])

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
  }, [settings, selectedTrackId])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
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

    await playWithCountIn(audio, settings, countInBeats, countInBpm)
    setIsPlaying(true)
  }

  function pausePlayback() {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Song Practice" subtitle="Upload songs, preserve pitch while changing tempo, loop sections, and run count-in starts." />

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
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
                onClick={() => setSelectedTrackId(track.id)}
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
            />
          ) : (
            <p className="text-sm text-zinc-400">Add a track to start playlist practice and setlists.</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startPlayback()}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
              disabled={!selectedTrack || isPlaying}
            >
              <Play size={12} /> Count-in + Play
            </button>
            <button
              type="button"
              onClick={pausePlayback}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-100"
              disabled={!selectedTrack || !isPlaying}
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
      </div>
    </div>
  )
}
