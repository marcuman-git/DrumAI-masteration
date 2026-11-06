import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OddTimeTrainerView } from './OddTimeTrainerView'
vi.mock('../groove-library/grooveAudio', () => ({ createGroovePlayer: () => vi.fn() }))
vi.mock('../../core/services/storage/practiceEvents', () => ({ startPracticeSession: vi.fn(() => 'odd-session'), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined) }))
class AudioMock {
  destination = {}
  get currentTime() { return performance.now() / 1000 }
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
}
function prepareAudio() {
  vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('Odd Time Trainer', () => {
  it('defaults to 60 BPM and updates counting groups for each meter', () => {
    render(<OddTimeTrainerView />)
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('60')
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveAttribute('max', '240')
    fireEvent.click(screen.getByRole('button', { name: '13/16' }))
    expect(screen.getByTestId('odd-unit-12')).toBeInTheDocument()
    expect(screen.getByTestId('odd-group-row-0').children).toHaveLength(3)
    expect(screen.getByTestId('odd-group-row-1').children).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Fill' }))
    expect(screen.getByTestId('odd-unit-0')).toHaveTextContent('R')
    expect(screen.getByTestId('odd-unit-1')).toHaveTextContent('L')
  })
  it('plays all 7/8 units and stops after one complete bar with Loop Off', async () => {
    prepareAudio(); render(<OddTimeTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Loop On' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(3200) })
    expect(screen.getByTestId('odd-unit-6')).toHaveClass('ring-2')
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
    expect(screen.getByText(/Completed bars: 1/)).toBeInTheDocument()
  })
  it('stops the old exercise when a grouping changes', async () => {
    prepareAudio(); render(<OddTimeTrainerView />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play' })); await Promise.resolve() })
    fireEvent.click(screen.getByRole('button', { name: '3 + 2 + 2' }))
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '3 + 2 + 2' })).toHaveAttribute('aria-pressed', 'true')
  })
})
