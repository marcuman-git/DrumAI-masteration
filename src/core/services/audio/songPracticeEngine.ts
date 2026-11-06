export interface SongTrack {
  id: string
  name: string
  fileUrl: string
}

export interface PlaybackSettings {
  tempoRate: number
  preservePitch: boolean
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
}

export function applyAudioSettings(audio: HTMLAudioElement, settings: PlaybackSettings): void {
  audio.playbackRate = settings.tempoRate

  const pitchFlag = settings.preservePitch
  ;(audio as HTMLMediaElement & { preservesPitch?: boolean }).preservesPitch = pitchFlag
  ;(audio as HTMLMediaElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = pitchFlag
  ;(audio as HTMLMediaElement & { mozPreservesPitch?: boolean }).mozPreservesPitch = pitchFlag
}

export function attachLoopHandler(audio: HTMLAudioElement, settings: PlaybackSettings): () => void {
  const onTimeUpdate = () => {
    if (!settings.loopEnabled) return
    if (audio.currentTime >= settings.loopEnd && settings.loopEnd > settings.loopStart) {
      audio.currentTime = settings.loopStart
    }
  }

  audio.addEventListener('timeupdate', onTimeUpdate)
  return () => audio.removeEventListener('timeupdate', onTimeUpdate)
}

export async function playWithCountIn(
  audio: HTMLAudioElement,
  settings: PlaybackSettings,
  countInBeats: number,
  bpm: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240 || !Number.isInteger(countInBeats) || countInBeats < 0 || countInBeats > 8) throw new Error('Invalid count-in settings.')
  const context = new AudioContext()
  await context.resume()
  if (signal?.aborted) { await context.close(); return }
  const beatDuration = 60 / bpm

  for (let i = 0; i < countInBeats; i += 1) {
    const osc = context.createOscillator()
    const gain = context.createGain()
    const t = context.currentTime + i * beatDuration

    osc.frequency.value = i === countInBeats - 1 ? 1100 : 800
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)

    osc.connect(gain)
    gain.connect(context.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  await new Promise<void>((resolve) => {
    const done = () => { signal?.removeEventListener('abort', abort); resolve() }
    const timer = window.setTimeout(done, countInBeats * beatDuration * 1000)
    const abort = () => { window.clearTimeout(timer); void context.close(); done() }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
  if (context.state !== 'closed') await context.close()
  if (signal?.aborted) return

  applyAudioSettings(audio, settings)
  await audio.play()
  if (signal?.aborted) audio.pause()
}
