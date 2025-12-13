import { createItems } from './data';
import { runHonoDom } from './hono-dom';
import { runVapor } from './vapor';
import type { BenchItem, RunnerKey, RunnerResult, RunOutcome } from './types';

const RUNNERS: Record<
  RunnerKey,
  (target: HTMLElement, items: BenchItem[], options: { updates: number; mutateCount: number }) => Promise<RunOutcome> | RunOutcome
> = {
  vapor: runVapor,
  hono: runHonoDom,
};

const summarize = (durations: number[]): RunnerResult => {
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const best = Math.min(...durations);
  const last = durations[durations.length - 1] ?? 0;
  return { durations, average, best, last };
};

const formatStats = (stats: RunnerResult, runs: number, count: number, updates: number) =>
  `状態更新: avg ${stats.average.toFixed(2)} ms / best ${stats.best.toFixed(2)} ms (runs: ${runs}, updates/run: ${updates}, nodes: ${count})`;

const resetCopy = 'まだ計測していません';

export const setupBenchmark = () => {
  const page = document.getElementById('benchmark-page');
  if (!page) return;

  const controls = document.getElementById('benchmark-controls');
  const defaultCount = Number(controls?.getAttribute('data-default-count') ?? 1200);
  const defaultRuns = Number(controls?.getAttribute('data-default-runs') ?? 3);

  const countInput = document.getElementById('bench-count') as HTMLInputElement | null;
  const runsInput = document.getElementById('bench-runs') as HTMLInputElement | null;
  if (countInput) countInput.value = String(defaultCount);
  if (runsInput) runsInput.value = String(defaultRuns);

  const statEls = {
    vapor: document.getElementById('vapor-stats-update'),
    hono: document.getElementById('hono-stats-update'),
  } as Record<RunnerKey, HTMLElement | null>;
  const targetEls = {
    vapor: document.getElementById('vapor-target'),
    hono: document.getElementById('hono-target'),
  } as Record<RunnerKey, HTMLElement | null>;
  const cleanups: Partial<Record<RunnerKey, () => void>> = {};

  const updateStatus = (key: RunnerKey, text: string) => {
    const el = statEls[key];
    if (el) el.textContent = text;
  };

  const clearTargets = () => {
    (Object.keys(targetEls) as RunnerKey[]).forEach((key) => {
      cleanups[key]?.();
      cleanups[key] = undefined;
      targetEls[key]?.replaceChildren();
      updateStatus(key, resetCopy);
    });
  };

  let busy = false;
  const toggleBusy = (state: boolean) => {
    busy = state;
    const buttons = page.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((button) => {
      button.disabled = state;
      button.setAttribute('aria-busy', state ? 'true' : 'false');
    });
  };

  const coerceNumber = (value: string | null | undefined, fallback: number) => {
    if (value === null || value === undefined) return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const updatesInput = document.getElementById('bench-updates') as HTMLInputElement | null;
  const defaultUpdates = Number(controls?.getAttribute('data-default-updates') ?? 20);
  if (updatesInput) updatesInput.value = String(defaultUpdates);

  const getConfig = () => ({
    count: Math.max(100, coerceNumber(countInput?.value, defaultCount)),
    runs: Math.max(1, Math.min(10, coerceNumber(runsInput?.value, defaultRuns))),
    updates: Math.max(1, Math.min(100, coerceNumber(updatesInput?.value, defaultUpdates))),
    mutateCount: 50,
  });

  const runSuite = async (
    key: RunnerKey,
    options?: {
      count?: number;
      runs?: number;
      updates?: number;
      mutateCount?: number;
      items?: BenchItem[];
    }
  ) => {
    if (!statEls[key] || !targetEls[key]) return;
    const base = getConfig();
    const count = options?.count ?? base.count;
    const runs = options?.runs ?? base.runs;
    const updates = options?.updates ?? base.updates;
    const mutateCount = options?.mutateCount ?? base.mutateCount;
    const items = options?.items ?? createItems(count);

    cleanups[key]?.();
    cleanups[key] = undefined;
    updateStatus(key, '計測中...');
    const durations: number[] = [];
    for (let i = 0; i < runs; i += 1) {
      const outcome = await RUNNERS[key](targetEls[key] as HTMLElement, items, { updates, mutateCount });
      durations.push(outcome.duration);
      cleanups[key] = outcome.cleanup;
    }
    const stats = summarize(durations);
    updateStatus(key, formatStats(stats, runs, count, updates));
    return stats;
  };

  const runnerButtons = page.querySelectorAll<HTMLButtonElement>('.bench-runner');
  runnerButtons.forEach((button) => {
    const key = button.getAttribute('data-runner') as RunnerKey | null;
    if (!key) return;
    button.addEventListener('click', async () => {
      if (busy) return;
      toggleBusy(true);
      try {
        await runSuite(key);
      } catch (error) {
        console.error(error);
        updateStatus(key, '計測に失敗しました');
      } finally {
        toggleBusy(false);
      }
    });
  });

  const runAllButton = document.getElementById('bench-run-all');
  runAllButton?.addEventListener('click', async () => {
    if (busy) return;
    toggleBusy(true);
    const config = getConfig();
    const sharedItems = createItems(config.count);
    try {
      await runSuite('vapor', { ...config, items: sharedItems });
      await runSuite('hono', { ...config, items: sharedItems });
    } catch (error) {
      console.error(error);
      updateStatus('vapor', '計測に失敗しました');
      updateStatus('hono', '計測に失敗しました');
    } finally {
      toggleBusy(false);
    }
  });

  const resetButton = document.getElementById('bench-reset');
  resetButton?.addEventListener('click', () => clearTargets());

  // 初期状態
  clearTargets();
};
