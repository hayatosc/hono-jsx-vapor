export type BenchItem = {
  id: number
  label: string
  value: number
}

export type RunnerOptions = {
  updates: number
  mutateCount: number
  seed: number
  warmup?: number
  case?: RunnerCase
}

export type RunOutcome = {
  mountDuration: number
  updateDurations: number[]
  cleanup?: () => void
}

export type StatSummary = {
  count: number
  average: number
  median: number
  p90: number
  p95: number
  stddev: number
  min: number
  max: number
}

export type RunnerResult = {
  mount: StatSummary
  update: StatSummary
  cleanup?: StatSummary
}

export type RunnerKey = 'vapor' | 'hono'

export type RunnerCase = 'update' | 'splice'
