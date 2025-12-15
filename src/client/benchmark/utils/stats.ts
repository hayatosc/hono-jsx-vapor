import type { RunnerResult, StatSummary } from '../types'

/**
 * Calculate statistical summary from an array of values.
 */
export const summarizeValues = (values: number[]): StatSummary => {
  if (values.length === 0) {
    return { count: 0, average: 0, median: 0, p90: 0, p95: 0, stddev: 0, min: 0, max: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const average = values.reduce((sum, value) => sum + value, 0) / count
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / count

  const percentile = (p: number) => {
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.round((p / 100) * (sorted.length - 1)))
    )
    return sorted[idx]
  }

  return {
    count,
    average,
    median: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    stddev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

/**
 * Format benchmark statistics as a human-readable string.
 */
export const formatStats = (
  stats: RunnerResult,
  runs: number,
  count: number,
  updates: number,
  operationLabel: string
): string => {
  const mount = `mount avg ${stats.mount.average.toFixed(2)} ms`
  const update = `${operationLabel} med ${stats.update.median.toFixed(2)} ms (avg ${stats.update.average.toFixed(2)}, p95 ${stats.update.p95.toFixed(
    2
  )}, σ ${stats.update.stddev.toFixed(2)})`
  const cleanup = stats.cleanup ? `unmount avg ${stats.cleanup.average.toFixed(2)} ms` : null
  const meta = `(runs: ${runs}, updates/run: ${updates}, nodes: ${count})`
  return [mount, update, cleanup, meta].filter(Boolean).join(' / ')
}

/**
 * Generate a deterministic seed from benchmark configuration.
 * Uses FNV-1a hash algorithm.
 */
export const computeSeed = (config: {
  count: number
  runs: number
  updates: number
  mutateCount: number
}): number => {
  const FNV_OFFSET_BASIS = 0x811c9dc5
  const FNV_PRIME = 0x01000193

  let hash = FNV_OFFSET_BASIS
  hash = Math.imul(hash ^ config.count, FNV_PRIME)
  hash = Math.imul(hash ^ config.runs, FNV_PRIME)
  hash = Math.imul(hash ^ config.updates, FNV_PRIME)
  hash = Math.imul(hash ^ config.mutateCount, FNV_PRIME)

  return hash >>> 0 || 1
}
