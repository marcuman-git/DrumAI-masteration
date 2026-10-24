import { expect, test } from '@playwright/test'

async function dismissOnboardingIfVisible(page: import('@playwright/test').Page) {
  const cancel = page.getByRole('button', { name: /cancel/i })
  const isVisible = await cancel.isVisible().catch(() => false)
  if (isVisible) {
    await cancel.click()
  }
}

test('dashboard and key modules load', async ({ page }) => {
  await page.goto('/')
  await dismissOnboardingIfVisible(page)

  await expect(page.getByRole('heading', { name: 'DrumMaster AI' })).toBeVisible()
  await expect(page.getByText('Home Dashboard')).toBeVisible()

  await page.getByRole('button', { name: /smart metronome/i }).click()
  await expect(page.getByText('Smart Metronome')).toBeVisible()

  await page.getByRole('button', { name: /timing analyzer/i }).click()
  await expect(page.getByText('Timing Analyzer')).toBeVisible()

  await page.getByRole('button', { name: /rhythm reading/i }).click()
  await expect(page.getByText('Rhythm Reading')).toBeVisible()

  await page.getByRole('button', { name: /song practice/i }).click()
  await expect(page.getByText('Song Practice')).toBeVisible()
})
