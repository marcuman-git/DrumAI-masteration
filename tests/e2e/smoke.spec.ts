import { expect, test } from '@playwright/test'

async function prepareApp(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'drummaster-ai-user-profile-fallback-v1',
      JSON.stringify({
        id: 'e2e-profile',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
        experienceLevel: 'Intermediate',
        styles: ['Rock'],
        goals: ['Improve timing'],
        dailyMinutes: 30,
        drumSetup: 'Practice Pad',
        hasMidiDevice: false,
      }),
    )
  })
}

test('dashboard and key modules load', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'DrumMaster AI - BETA' })).toBeVisible()
  await expect(page.getByText('Home Dashboard')).toBeVisible()
  await expect(page.getByRole('button', { name: /smart metronome/i })).toBeVisible()

  await page.getByRole('button', { name: /smart metronome/i }).click()
  await expect(page.getByText('Smart Metronome')).toBeVisible()

  await page.getByRole('button', { name: /timing analyzer/i }).click()
  await expect(page.getByText('Timing Analyzer')).toBeVisible()

  await page.getByRole('button', { name: /rhythm reading/i }).click()
  await expect(page.getByText('Rhythm Reading')).toBeVisible()

  await page.getByRole('button', { name: /song practice/i }).click()
  await expect(page.getByText('Song Practice')).toBeVisible()
})
