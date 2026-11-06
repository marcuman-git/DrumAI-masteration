import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SongChartEditor } from './SongChartEditor'
vi.mock('../../core/services/storage/practiceEvents', () => ({ startPracticeSession: vi.fn(() => 'chart-session'), stopPracticeSession: vi.fn(), trackPracticeEvent: vi.fn(async () => undefined) }))
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
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.removeItem('drummaster-song-charts-v1') })
describe('Song Chart editor', () => {
  it('edits cells, duplicates bars, and retains multiple named saves', () => {
    render(<SongChartEditor />)
    fireEvent.click(screen.getByRole('button', { name: 'Snare step 1: rest' }))
    expect(screen.getByRole('button', { name: 'Snare step 1: note' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Chart title' }), { target: { value: 'First chart' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as new' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate bar' }))
    expect(screen.getByRole('button', { name: 'Bar 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Snare step 1: note' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Chart title' }), { target: { value: 'Second chart' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as new' }))
    expect(screen.getByRole('option', { name: 'First chart' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Second chart' })).toBeInTheDocument()
  })
  it('plays every bar and stops after the final highlighted column', async () => {
    vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioMock)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    render(<SongChartEditor />)
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate bar' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play chart' })); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(7850) })
    expect(screen.getByRole('button', { name: 'Bar 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Kick step 16: rest' })).toHaveClass('ring-2')
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(screen.getByRole('button', { name: 'Play chart' })).toBeEnabled()
    expect(screen.getByText('Chart completed. Session saved.')).toBeInTheDocument()
  })
})
