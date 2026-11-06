import { afterEach, describe, expect, it, vi } from 'vitest'
import { playWithCountIn } from './songPracticeEngine'
class AudioMock {
  currentTime = 0
  state = 'running'
  destination = {}
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => { this.state = 'closed' })
  createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('song count-in cancellation', () => {
  it('does not play a track after count-in cancellation', async () => {
    vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioMock)
    const audio = { play: vi.fn(async () => undefined), pause: vi.fn() } as unknown as HTMLAudioElement
    const controller = new AbortController()
    const pending = playWithCountIn(audio, { tempoRate: 1, preservePitch: true, loopEnabled: false, loopStart: 0, loopEnd: 10 }, 4, 60, controller.signal)
    await Promise.resolve(); controller.abort(); await pending
    expect(audio.play).not.toHaveBeenCalled()
  })
  it('rejects invalid count-in tempos before creating audio', async () => {
    const audio = {} as HTMLAudioElement
    await expect(playWithCountIn(audio, { tempoRate: 1, preservePitch: true, loopEnabled: false, loopStart: 0, loopEnd: 10 }, 4, 0)).rejects.toThrow('Invalid count-in settings')
  })
})
