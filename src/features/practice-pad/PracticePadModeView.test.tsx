import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PracticePadModeView } from './PracticePadModeView'
vi.mock('../../core/services/storage/practiceEvents', () => ({ startPracticeSession: vi.fn(() => crypto.randomUUID()), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined) }))
class AudioMock {
  destination = {}
  get currentTime() { return performance.now() / 1000 }
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
}
function prepare() {
  vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('Practice Pad guided sessions', () => {
  it('defaults to 60 BPM and supports routine and lead selection', () => {
    render(<PracticePadModeView />)
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('60')
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveAttribute('max', '240')
    fireEvent.change(screen.getByRole('combobox', { name: 'Routine' }), { target: { value: 'rudi' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Left-hand lead' }))
    expect(screen.getByText(/Paradiddle control/)).toBeInTheDocument()
  })
  it('excludes paused time and resumes the remaining session', async () => {
    prepare(); render(<PracticePadModeView />)
    fireEvent.change(screen.getByRole('slider', { name: 'Session minutes' }), { target: { value: '1' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start session' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    const paused = screen.getByRole('progressbar', { name: 'Session progress' }).getAttribute('value')
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(screen.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute('value', paused)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resume' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(51000) })
    expect(screen.getByRole('button', { name: 'Start session' })).toBeEnabled()
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
  it('highlights cues, supports live tempo changes, and stops cleanly', async () => {
    prepare(); render(<PracticePadModeView />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start session' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(screen.getByTestId('pad-hand-cue')).toHaveTextContent('R')
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo BPM' }), { target: { value: '120' } })
    expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('button', { name: 'Start session' })).toBeEnabled()
  })
})
