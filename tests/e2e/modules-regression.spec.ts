import { expect, test } from '@playwright/test'

test('phase 3 module regressions', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Home Dashboard')).toBeVisible()

  await page.getByRole('button', { name: /rhythm reading/i }).click()
  await expect(page.getByText('Rhythm Reading')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByRole('button', { name: /stop/i }).first()).toBeVisible()
  await page.getByRole('button', { name: /stop/i }).first().click()

  await page.getByRole('button', { name: /rhythm dictation/i }).click()
  await expect(page.getByText('Rhythm Dictation')).toBeVisible()
  await page.getByRole('button', { name: /confirm answer/i }).click({ trial: true }).catch(() => undefined)
  await page.getByRole('button', { name: /next quiz/i }).click({ trial: true }).catch(() => undefined)
  await expect(page.getByRole('button', { name: /play rhythm/i })).toBeVisible()

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
