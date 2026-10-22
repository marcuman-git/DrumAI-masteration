import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MetronomeView } from './MetronomeView'

class AudioContextMock {
  currentTime = 0
  destination = {}

  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }
  }
}

beforeAll(() => {
  vi.stubGlobal('AudioContext', AudioContextMock)
})

describe('MetronomeView', () => {
  it('supports tap tempo and bpm slider updates', () => {
    render(<MetronomeView />)

    fireEvent.click(screen.getByRole('button', { name: /tap tempo/i }))
    fireEvent.click(screen.getByRole('button', { name: /tap tempo/i }))

    const slider = screen.getAllByRole('slider')[0]
    fireEvent.change(slider, { target: { value: '140' } })

    expect(screen.getByText('140')).toBeInTheDocument()
  })
})
