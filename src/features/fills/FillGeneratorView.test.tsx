import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FillGeneratorView } from './FillGeneratorView'

const playPatternMock = vi.fn()
const generateFillPatternMock = vi.fn()

vi.mock('../../core/services/audio/rhythmPlayback', () => ({
  playPattern: (...args: unknown[]) => playPatternMock(...args),
}))

vi.mock('../../core/services/notation/notationService', () => ({
  generateFillPattern: (...args: unknown[]) => generateFillPatternMock(...args),
}))

describe('FillGeneratorView', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    playPatternMock.mockReset()
    generateFillPatternMock.mockReset()
    localStorage.clear()
    generateFillPatternMock.mockReturnValue({
      title: 'Generated Fill',
      notes: ['c5/8', 'd4/16', 'f4/16', 'c5/8r'],
    })
  })

  it('renders default tempo and allows regeneration', () => {
    render(<FillGeneratorView />)

    expect(screen.getByText(/tempo 60 bpm/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new fill/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /new fill/i }))
    expect(generateFillPatternMock).toHaveBeenCalled()
  })

  it('persists start hand selection', () => {
    render(<FillGeneratorView />)

    const selects = screen.getAllByRole('combobox')
    const startHandSelect = selects[1]
    fireEvent.change(startHandSelect, { target: { value: 'L' } })

    expect(localStorage.getItem('drummaster-fill-start-hand-v1')).toBe('L')
  })

  it('supports play and manual stop', async () => {
    const resolveRef: { current: null | (() => void) } = { current: null }
    playPatternMock.mockImplementation(
      (_pattern: unknown, _tempo: unknown, onStep?: (index: number) => void) =>
        new Promise<void>((resolve) => {
          resolveRef.current = () => resolve()
          onStep?.(0)
        }),
    )

    render(<FillGeneratorView />)

    const playButtons = screen.getAllByRole('button', { name: /play fill/i })
    fireEvent.click(playButtons[0])
    expect(screen.getByText(/playing\.\.\./i)).toBeInTheDocument()

    const stopButtons = screen.getAllByRole('button', { name: /stop/i })
    fireEvent.click(stopButtons[0])
    resolveRef.current?.()

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /play fill/i })[0]).toBeInTheDocument()
    })
  })
})
