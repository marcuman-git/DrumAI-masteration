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

test('phase 3 module regressions', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/')
  await expect(page.getByText('Home Dashboard')).toBeVisible()
  await expect(page.getByRole('button', { name: /rhythm reading/i })).toBeVisible()

  await page.getByRole('button', { name: /rhythm reading/i }).click()
  await expect(page.getByText('Rhythm Reading')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByRole('button', { name: /stop/i }).first()).toBeVisible()
  await page.getByRole('button', { name: /stop/i }).first().click()

  await page.getByRole('button', { name: /rhythm dictation/i }).click()
  await expect(page.getByText('Rhythm Dictation')).toBeVisible()
  await expect(page.getByText(/listen and identify/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /confirm answer/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /next quiz/i })).toBeVisible()

  await page.getByRole('button', { name: /groove library/i }).click()
  await expect(page.getByText('Groove Library')).toBeVisible()
  await page.getByRole('button', { name: /preview/i }).first().click()
  await expect(page.getByRole('button', { name: /stop/i }).first()).toBeVisible()
  await page.getByRole('button', { name: /stop/i }).first().click()

  await page.getByRole('button', { name: /fill generator/i }).click()
  await expect(page.getByText('Fill Generator')).toBeVisible()
  await page.getByRole('button', { name: /new fill/i }).click()
  await expect(page.getByText(/musical bar chart/i)).toBeVisible()

  await page.getByRole('button', { name: /analytics/i }).click()
  await expect(page.getByText('Analytics')).toBeVisible()
  await expect(page.getByRole('button', { name: /reset test data/i })).toBeVisible()
})
