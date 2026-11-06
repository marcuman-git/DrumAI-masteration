import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackupPanel } from './BackupPanel'
import { restorePracticeBackup } from './backupService'
const fixtures = vi.hoisted(() => ({
  empty: { app: 'DrumMaster AI' as const, schema: 1 as const, createdAt: '2026-11-06T12:00:00Z', events: [], journal: [] },
}))
vi.mock('./backupService', () => ({ createPracticeBackup: vi.fn(async () => fixtures.empty), restorePracticeBackup: vi.fn(async (backup: unknown) => backup), downloadLocalFile: vi.fn(), sessionCsv: vi.fn(() => 'CSV') }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('practice backup controls', () => {
  it('rejects an invalid file before showing restore confirmation', async () => {
    render(<BackupPanel events={[]} onRestored={vi.fn()} />)
    const file = new File(['bad'], 'bad.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => 'bad' })
    fireEvent.change(screen.getByLabelText('Choose local backup'), { target: { files: [file] } })
    expect(await screen.findByText('This file is not valid JSON.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm merge restore' })).not.toBeInTheDocument()
    expect(restorePracticeBackup).not.toHaveBeenCalled()
  })
  it('previews additions and writes only after explicit confirmation', async () => {
    const incoming = { ...fixtures.empty, events: [{ id: 'e1', moduleId: 'metronome', type: 'score', timestamp: fixtures.empty.createdAt }] }
    const restored = vi.fn()
    render(<BackupPanel events={[]} onRestored={restored} />)
    const file = new File([JSON.stringify(incoming)], 'practice.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(incoming) })
    fireEvent.change(screen.getByLabelText('Choose local backup'), { target: { files: [file] } })
    expect(await screen.findByText('New events: 1 / New reflections: 0')).toBeInTheDocument()
    expect(restorePracticeBackup).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm merge restore' }))
    await waitFor(() => expect(restored).toHaveBeenCalledOnce())
    expect(restorePracticeBackup).toHaveBeenCalledOnce()
  })
})
