import type { DrumNotationPattern } from '../notation/notationService'

const durationByToken: Record<string, number> = {
  '/4': 1,
  '/8': 0.5,
  '/16': 0.25,
}

export function parseDuration(noteToken: string): number {
  const durationKey = Object.keys(durationByToken).find((key) => noteToken.includes(key))
  return durationKey ? durationByToken[durationKey] : 0.5
}

export async function playPattern(
  pattern: DrumNotationPattern,
  bpm: number,
  onStep?: (index: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const context = new AudioContext()
  const beatMs = 60000 / bpm
  let offsetMs = 0
  const timerIds: number[] = []

  pattern.notes.forEach((token, index) => {
    if (onStep) {
      timerIds.push(window.setTimeout(() => onStep(index), Math.max(0, offsetMs - 20)))
    }

    if (token.includes('r')) {
      offsetMs += beatMs * parseDuration(token)
      return
    }

    const time = context.currentTime + offsetMs / 1000
    const osc = context.createOscillator()
    const gain = context.createGain()

    osc.type = token.includes('d4') ? 'triangle' : token.includes('f4') ? 'square' : 'sine'
    osc.frequency.value = token.includes('d4') ? 120 : token.includes('f4') ? 220 : 900

    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.25, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)

    osc.connect(gain)
    gain.connect(context.destination)

    osc.start(time)
    osc.stop(time + 0.09)

    offsetMs += beatMs * parseDuration(token)
  })

  await new Promise<void>((resolve) => {
    const doneId = window.setTimeout(resolve, offsetMs + 120)
    timerIds.push(doneId)

    if (signal) {
      if (signal.aborted) {
        resolve()
        return
      }

      signal.addEventListener(
        'abort',
        () => {
          timerIds.forEach((id) => window.clearTimeout(id))
          resolve()
        },
        { once: true },
      )
    }
  })

  await context.close()
}
