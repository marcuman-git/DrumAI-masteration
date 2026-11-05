import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeedTrainerView } from './SpeedTrainerView'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('Speed Trainer', () => {
  it('defaults to 60 BPM with 40–240 range and selectable endurance', () => {
    render(<SpeedTrainerView />)
    const slider = screen.getByRole('slider', { name: 'Target BPM' })
    expect(slider).toHaveValue('60')
    expect(slider).toHaveAttribute('min', '40')
    expect(slider).toHaveAttribute('max', '240')
    fireEvent.change(screen.getByRole('combobox', { name: 'Training mode' }), { target: { value: '60' } })
    expect(screen.getByText('60.0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Double Bass' })).toBeInTheDocument()
  })
  it('handles denied microphone access without crashing', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<SpeedTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }))
    expect(await screen.findByText(/Microphone unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start drill' })).toBeEnabled()
  })
})
