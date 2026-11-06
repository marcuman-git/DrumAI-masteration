import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PolyrhythmTrainerView } from './PolyrhythmTrainerView'
vi.mock('../../core/services/storage/practiceEvents', () => ({ startPracticeSession: vi.fn(() => 'poly-session'), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined) }))
class AudioMock {
  destination = {}
  get currentTime() { return performance.now() / 1000 }
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
}
function prepareAudio() {
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', AudioMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('Polyrhythm Trainer', () => {
  it('shows every subdivision for 7:8 and renders genuinely different views', () => {
    render(<PolyrhythmTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: '7:8' }))
    expect(screen.getAllByLabelText(/First stream step/)).toHaveLength(56)
    expect(screen.getAllByLabelText(/Second stream step/)).toHaveLength(56)
    fireEvent.change(screen.getByRole('combobox', { name: 'View Mode' }), { target: { value: 'Circle' } })
    expect(screen.getByRole('img', { name: /Two polyrhythm circles/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'View Mode' }), { target: { value: 'Timeline' } })
    expect(screen.getByRole('img', { name: /Complete polyrhythm timeline/ })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('60')
  })
  it('stops after a complete cycle with loop disabled', async () => {
    prepareAudio(); render(<PolyrhythmTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Loop On' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(4300) })
    expect(screen.getByText('Completed cycles: 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
  })
  it('keeps playing when views change, but stops when the ratio changes', async () => {
    prepareAudio(); render(<PolyrhythmTrainerView />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    fireEvent.change(screen.getByRole('combobox', { name: 'View Mode' }), { target: { value: 'Circle' } })
    expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mute first' }))
    expect(screen.getByRole('button', { name: 'Unmute first' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '2:3' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '2:3' })).toHaveAttribute('aria-pressed', 'true')
  })
})
