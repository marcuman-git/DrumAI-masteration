import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndependenceTrainerView } from './IndependenceTrainerView'

vi.mock('../../core/services/storage/practiceEvents', () => ({
  startPracticeSession: vi.fn(() => 'test-session'), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined),
}))
class AudioMock {
  sampleRate = 1000
  destination = {}
  get currentTime() { return performance.now() / 1000 }
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createBuffer() { return { getChannelData: () => new Float32Array(250) } }
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() } }
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.removeItem('drummaster-independence-v1') })
describe('Independence Trainer', () => {
  it('edits individual steps, mutes limbs, and saves/loads settings', () => {
    render(<IndependenceTrainerView />)
    const cell = screen.getByRole('button', { name: 'LH step 1' })
    expect(cell).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(cell)
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'LH pattern' })).toHaveValue('Custom')
    fireEvent.click(screen.getByRole('button', { name: 'Save exercise' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rock' }))
    expect(cell).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Load exercise' }))
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Mute RH' }))
    expect(screen.getByRole('button', { name: 'Unmute RH' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('plays a full non-looped bar, then stops automatically', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', AudioMock)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    render(<IndependenceTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Loop On' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(4300) })
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
    expect(screen.getByText('Completed bars: 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })
  it('honors loop changes during playback and keeps the edited tempo', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', AudioMock)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    render(<IndependenceTrainerView />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(4500) })
    expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo BPM' }), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Loop On' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('120')
    expect(screen.getByText('Completed bars: 2')).toBeInTheDocument()
  })
})
