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
): Promise<void> {
  const context = new AudioContext()
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

  await new Promise((resolve) => window.setTimeout(resolve, countInBeats * beatDuration * 1000))
  await context.close()

  applyAudioSettings(audio, settings)
  await audio.play()
}
