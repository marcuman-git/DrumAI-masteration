import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DynamicsTrainerView } from './DynamicsTrainerView'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('Dynamics Trainer', () => {
  it('requires calibration, shows all targets, and supports target selection', () => {
    render(<DynamicsTrainerView />)
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'MF' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'PPP' }))
    expect(screen.getByRole('button', { name: 'PPP' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Target: 12%/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FFF' })).toBeInTheDocument()
  })
  it('handles permission denial with guidance instead of a blank screen', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<DynamicsTrainerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Calibrate microphone' }))
    expect(await screen.findByText(/Microphone unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeDisabled()
  })
})
