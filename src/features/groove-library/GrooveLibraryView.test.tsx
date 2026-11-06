import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrooveLibraryView } from './GrooveLibraryView'
vi.mock('../../core/services/storage/practiceEvents', () => ({ startPracticeSession: vi.fn(() => 'groove-session'), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined) }))
class AudioMock {
  sampleRate = 1000
  destination = {}
  get currentTime() { return performance.now() / 1000 }
  resume = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  createBuffer() { return { getChannelData: () => new Float32Array(300) } }
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() } }
}
function prepareAudio() {
  vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.removeItem('drummaster-groove-playlist-v1') })
describe('Groove Library', () => {
  it('shows instrument notes, ghost notes and correct meter grids', () => {
    render(<GrooveLibraryView />)
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('60')
    fireEvent.click(screen.getByRole('button', { name: 'Funk' }))
    expect(screen.getAllByLabelText(/Snare step.*ghost/)).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Progressive' }))
    expect(screen.getAllByLabelText(/Kick step/)).toHaveLength(14)
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveAttribute('max', '240')
  })
  it('preserves playlist entries through remount and removes only the selected entry', () => {
    const first = render(<GrooveLibraryView />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])
    first.unmount(); render(<GrooveLibraryView />)
    expect(screen.getByRole('button', { name: 'Remove Basic Rock Pocket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Ghost Grid Funk' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Basic Rock Pocket' }))
    expect(screen.queryByRole('button', { name: 'Remove Basic Rock Pocket' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Ghost Grid Funk' })).toBeInTheDocument()
  })
  it('highlights the final column, then completes one bar with Loop Off', async () => {
    prepareAudio(); render(<GrooveLibraryView />)
    fireEvent.click(screen.getByRole('button', { name: 'Loop On' }))
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(3850) })
    expect(screen.getByLabelText('Hi-hat step 16: rest')).toHaveClass('ring-2')
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByText(/Completed bars: 1/)).toBeInTheDocument()
  })
  it('stops the old groove when the style changes during playback', async () => {
    prepareAudio(); render(<GrooveLibraryView />)
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]); await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jazz' }))
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByLabelText('Ride step 1: note')).toBeInTheDocument()
  })
})
