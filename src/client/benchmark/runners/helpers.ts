import type { BenchItem, RunnerOptions } from '../types'

/**
 * Wait for the browser to paint the next frame twice.
 * This ensures DOM updates are fully applied and visible.
 */
export const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

/**
 * Measure mount performance and return timing.
 */
export const measureMount = async (mountFn: () => void | Promise<void>): Promise<number> => {
  const start = performance.now()
  await mountFn()
  await nextPaint()
  return performance.now() - start
}

/**
 * Safe cleanup helper that suppresses known harmless errors.
 */
export const safeCleanup = (
  cleanupFn: () => void,
  errorFilter?: (error: unknown) => boolean,
): void => {
  try {
    cleanupFn()
  } catch (error) {
    if (errorFilter && errorFilter(error)) {
      return // Suppress known harmless errors
    }
    const message = error instanceof Error ? error.message : String(error)
    console.warn('Cleanup failed', message)
  }
}

/**
 * Create a runner context with common setup logic.
 */
export const createRunnerContext = (
  target: HTMLElement,
  items: BenchItem[],
  options: RunnerOptions,
) => {
  target.replaceChildren()
  const mountPoint = document.createElement('div')
  target.appendChild(mountPoint)

  const { updates, mutateCount, seed, warmup = 1, case: runCase = 'update' } = options

  return {
    mountPoint,
    target,
    items,
    updates,
    mutateCount,
    seed,
    warmup,
    runCase,
  }
}
