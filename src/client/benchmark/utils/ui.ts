import type { RunnerCase, RunnerKey } from '../types'

export const RESET_MESSAGE = 'まだ計測していません'

/**
 * Update the status text for a specific runner and case.
 */
export const updateStatus = (
  statEls: Record<RunnerKey, Record<RunnerCase, HTMLElement | null>>,
  key: RunnerKey,
  runCase: RunnerCase,
  text: string
): void => {
  const el = statEls[key][runCase]
  if (el) el.textContent = text
}

/**
 * Update status text for all runners and specified cases.
 */
export const updateStatuses = (
  statEls: Record<RunnerKey, Record<RunnerCase, HTMLElement | null>>,
  runnerKeys: RunnerKey[],
  cases: RunnerCase[],
  text: string
): void => {
  runnerKeys.forEach((key) => cases.forEach((runCase) => updateStatus(statEls, key, runCase, text)))
}

/**
 * Clear a specific runner's target element and cleanup.
 */
export const clearRunner = (
  targetEls: Record<RunnerKey, HTMLElement | null>,
  cleanups: Partial<Record<RunnerKey, () => void>>,
  key: RunnerKey
): void => {
  cleanups[key]?.()
  cleanups[key] = undefined
  targetEls[key]?.replaceChildren()
}

/**
 * Clear all runner targets and reset status messages.
 */
export const clearTargets = (
  targetEls: Record<RunnerKey, HTMLElement | null>,
  cleanups: Partial<Record<RunnerKey, () => void>>,
  statEls: Record<RunnerKey, Record<RunnerCase, HTMLElement | null>>,
  runnerKeys: RunnerKey[],
  cases: RunnerCase[]
): void => {
  runnerKeys.forEach((key) => clearRunner(targetEls, cleanups, key))
  updateStatuses(statEls, runnerKeys, cases, RESET_MESSAGE)
}

/**
 * Toggle busy state and disable/enable all buttons.
 */
export const toggleBusy = (page: HTMLElement, state: boolean): void => {
  const buttons = page.querySelectorAll<HTMLButtonElement>('button')
  buttons.forEach((button) => {
    button.disabled = state
    button.setAttribute('aria-busy', state ? 'true' : 'false')
  })
}

/**
 * Execute a task with busy state guard.
 */
export const runWithBusyGuard = async (
  page: HTMLElement,
  busy: { value: boolean },
  task: () => Promise<void>,
  onError: (error: unknown) => void
): Promise<void> => {
  if (busy.value) return

  busy.value = true
  toggleBusy(page, true)

  try {
    await task()
  } catch (error) {
    onError(error)
  } finally {
    busy.value = false
    toggleBusy(page, false)
  }
}

/**
 * Coerce a string value to a number with a fallback.
 */
export const coerceNumber = (value: string | null | undefined, fallback: number): number => {
  if (value === null || value === undefined) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : fallback
}
