export type BenchItem = {
  id: number;
  label: string;
  value: number;
};

export type RunOutcome = {
  duration: number;
  cleanup?: () => void;
};

export type RunnerResult = {
  durations: number[];
  average: number;
  best: number;
  last: number;
};

export type RunnerKey = 'vapor' | 'hono';
