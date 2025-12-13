import { createItems } from './data';
import { runHonoDom } from './hono-dom';
import { runVapor } from './vapor';
import type { BenchItem, RunnerKey, RunnerResult, RunOutcome, RunnerOptions } from './types';

const RUNNERS: Record<
  RunnerKey,
  (target: HTMLElement, items: BenchItem[], options: RunnerOptions) => Promise<RunOutcome> | RunOutcome
> = {
  vapor: runVapor,
  hono: runHonoDom,
};

const summarizeValues = (values: number[]): RunnerResult['mount'] => {
  if (values.length === 0) {
    return { count: 0, average: 0, median: 0, p90: 0, p95: 0, stddev: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const average = values.reduce((sum, value) => sum + value, 0) / count;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / count;
  const percentile = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[idx];
  };
  return {
    count,
    average,
    median: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    stddev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

const formatStats = (stats: RunnerResult, runs: number, count: number, updates: number) => {
  const mount = `mount avg ${stats.mount.average.toFixed(2)} ms`;
  const update = `update med ${stats.update.median.toFixed(2)} ms (avg ${stats.update.average.toFixed(
    2
  )}, p95 ${stats.update.p95.toFixed(2)}, σ ${stats.update.stddev.toFixed(2)})`;
  const cleanup = stats.cleanup ? `unmount avg ${stats.cleanup.average.toFixed(2)} ms` : null;
  const meta = `(runs: ${runs}, updates/run: ${updates}, nodes: ${count})`;
  return [mount, update, cleanup, meta].filter(Boolean).join(' / ');
};

const resetCopy = 'まだ計測していません';

const computeSeed = (input: { count: number; runs: number; updates: number; mutateCount: number }) => {
  let hash = 0x811c9dc5; // FNV offset basis
  hash = Math.imul(hash ^ input.count, 0x01000193);
  hash = Math.imul(hash ^ input.runs, 0x01000193);
  hash = Math.imul(hash ^ input.updates, 0x01000193);
  hash = Math.imul(hash ^ input.mutateCount, 0x01000193);
  return (hash >>> 0) || 1;
};

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
  let flipOrder = false;

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
      seed?: number;
      warmup?: number;
      items?: BenchItem[];
    }
  ) => {
    if (!statEls[key] || !targetEls[key]) return;
    const base = getConfig();
    const count = options?.count ?? base.count;
    const runs = options?.runs ?? base.runs;
    const updates = options?.updates ?? base.updates;
    const mutateCount = options?.mutateCount ?? base.mutateCount;
    const baseSeed = options?.seed ?? computeSeed({ count, runs, updates, mutateCount });
    const warmup = options?.warmup ?? 1;
    const items = options?.items ?? createItems(count, baseSeed);

    cleanups[key]?.();
    cleanups[key] = undefined;
    updateStatus(key, '計測中...');
    const updateDurations: number[] = [];
    const mountDurations: number[] = [];
    const cleanupDurations: number[] = [];
    let previousCleanup: (() => void) | undefined;
    for (let i = 0; i < runs; i += 1) {
      // 前回の run を必ず後始末してから次の run を実行する
      if (previousCleanup) {
        try {
          const start = performance.now();
          previousCleanup();
          cleanupDurations.push(performance.now() - start);
        } catch (error) {
          console.warn('Failed to cleanup previous run', error);
        }
      }
      const outcome = await RUNNERS[key](targetEls[key] as HTMLElement, items, {
        updates,
        mutateCount,
        seed: baseSeed + i,
        warmup,
      });
      updateDurations.push(...outcome.updateDurations);
      mountDurations.push(outcome.mountDuration);
      previousCleanup = outcome.cleanup;
    }
    cleanups[key] = previousCleanup;
    const stats: RunnerResult = {
      update: summarizeValues(updateDurations),
      mount: summarizeValues(mountDurations),
      cleanup: cleanupDurations.length ? summarizeValues(cleanupDurations) : undefined,
    };
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
    const baseSeed = computeSeed(config);
    const sharedItems = createItems(config.count, baseSeed);
    try {
      const order: RunnerKey[] = flipOrder ? ['hono', 'vapor'] : ['vapor', 'hono'];
      flipOrder = !flipOrder;
      for (const key of order) {
        await runSuite(key, { ...config, items: sharedItems, seed: baseSeed });
      }
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
