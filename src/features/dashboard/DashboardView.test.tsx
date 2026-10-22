import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardView } from './DashboardView'

describe('DashboardView', () => {
  it('renders core performance and skill cards', () => {
    render(<DashboardView />)

    expect(screen.getByText(/home dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/today's practice goal/i)).toBeInTheDocument()
    expect(screen.getByText(/current streak/i)).toBeInTheDocument()

    expect(screen.getByText('Timing')).toBeInTheDocument()
    expect(screen.getByText('Coordination')).toBeInTheDocument()
    expect(screen.getByText('Dynamics')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
    expect(screen.getByText('Speed')).toBeInTheDocument()
    expect(screen.getByText('Overall')).toBeInTheDocument()
  })
})
