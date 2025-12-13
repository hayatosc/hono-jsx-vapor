import { createItems } from './data';
import { runHonoDom } from './hono-dom';
import type { BenchItem, RunnerCase, RunnerKey, RunnerOptions, RunnerResult, RunOutcome } from './types';
import { runVapor } from './vapor';

type BenchConfig = {
  count: number;
  runs: number;
  updates: number;
  mutateCount: number;
};

type SuiteOptions = Partial<BenchConfig> & {
  seed?: number;
  warmup?: number;
  items?: BenchItem[];
  case?: RunnerCase;
};

const RUNNERS: Record<RunnerKey, (target: HTMLElement, items: BenchItem[], options: RunnerOptions) => Promise<RunOutcome> | RunOutcome> = {
  vapor: runVapor,
  hono: runHonoDom,
};

const CASES: RunnerCase[] = ['update', 'splice'];

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

const formatStats = (stats: RunnerResult, runs: number, count: number, updates: number, operationLabel: string) => {
  const mount = `mount avg ${stats.mount.average.toFixed(2)} ms`;
  const update = `${operationLabel} med ${stats.update.median.toFixed(2)} ms (avg ${stats.update.average.toFixed(2)}, p95 ${stats.update.p95.toFixed(
    2
  )}, σ ${stats.update.stddev.toFixed(2)})`;
  const cleanup = stats.cleanup ? `unmount avg ${stats.cleanup.average.toFixed(2)} ms` : null;
  const meta = `(runs: ${runs}, updates/run: ${updates}, nodes: ${count})`;
  return [mount, update, cleanup, meta].filter(Boolean).join(' / ');
};

const resetCopy = 'まだ計測していません';

const computeSeed = (input: BenchConfig) => {
  let hash = 0x811c9dc5; // FNV offset basis
  hash = Math.imul(hash ^ input.count, 0x01000193);
  hash = Math.imul(hash ^ input.runs, 0x01000193);
  hash = Math.imul(hash ^ input.updates, 0x01000193);
  hash = Math.imul(hash ^ input.mutateCount, 0x01000193);
  return hash >>> 0 || 1;
};

export const setupBenchmark = () => {
  const page = document.getElementById('benchmark-page');
  if (!page) return;

  const controls = document.getElementById('benchmark-controls');
  const defaultCount = Number(controls?.getAttribute('data-default-count') ?? 1200);
  const defaultRuns = Number(controls?.getAttribute('data-default-runs') ?? 3);
  const defaultUpdates = Number(controls?.getAttribute('data-default-updates') ?? 20);

  const countInput = document.getElementById('bench-count') as HTMLInputElement | null;
  const runsInput = document.getElementById('bench-runs') as HTMLInputElement | null;
  const updatesInput = document.getElementById('bench-updates') as HTMLInputElement | null;
  if (countInput) countInput.value = String(defaultCount);
  if (runsInput) runsInput.value = String(defaultRuns);
  if (updatesInput) updatesInput.value = String(defaultUpdates);

  const statEls = {
    vapor: {
      update: document.getElementById('vapor-stats-update'),
      splice: document.getElementById('vapor-stats-splice'),
    },
    hono: {
      update: document.getElementById('hono-stats-update'),
      splice: document.getElementById('hono-stats-splice'),
    },
  } as Record<RunnerKey, Record<RunnerCase, HTMLElement | null>>;
  const targetEls = {
    vapor: document.getElementById('vapor-target'),
    hono: document.getElementById('hono-target'),
  } as Record<RunnerKey, HTMLElement | null>;
  const runnerKeys = Object.keys(targetEls) as RunnerKey[];

  const cleanups: Partial<Record<RunnerKey, () => void>> = {};
  let flipOrder = false;

  const updateStatus = (key: RunnerKey, runCase: RunnerCase, text: string) => {
    const el = statEls[key][runCase];
    if (el) el.textContent = text;
  };

  const updateStatuses = (text: string, runCases: RunnerCase[] = CASES) => {
    runnerKeys.forEach((key) => runCases.forEach((runCase) => updateStatus(key, runCase, text)));
  };

  const clearRunner = (key: RunnerKey) => {
    cleanups[key]?.();
    cleanups[key] = undefined;
    targetEls[key]?.replaceChildren();
  };

  const clearTargets = () => {
    runnerKeys.forEach(clearRunner);
    updateStatuses(resetCopy);
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

  const runWithBusyGuard = async (task: () => Promise<void>, onError: (error: unknown) => void) => {
    if (busy) return;
    toggleBusy(true);
    try {
      await task();
    } catch (error) {
      onError(error);
    } finally {
      toggleBusy(false);
    }
  };

  const coerceNumber = (value: string | null | undefined, fallback: number) => {
    if (value === null || value === undefined) return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getConfig = (): BenchConfig => ({
    count: Math.max(100, coerceNumber(countInput?.value, defaultCount)),
    runs: Math.max(1, Math.min(10, coerceNumber(runsInput?.value, defaultRuns))),
    updates: Math.max(1, Math.min(100, coerceNumber(updatesInput?.value, defaultUpdates))),
    mutateCount: 50,
  });

  const nextRunnerOrder = () => {
    const order: RunnerKey[] = flipOrder ? ['hono', 'vapor'] : ['vapor', 'hono'];
    flipOrder = !flipOrder;
    return order;
  };

  const runSuite = async (key: RunnerKey, options?: SuiteOptions) => {
    const runCase = options?.case ?? 'update';
    if (!statEls[key][runCase] || !targetEls[key]) return;

    const baseConfig = getConfig();
    const mergedConfig: BenchConfig = {
      count: options?.count ?? baseConfig.count,
      runs: options?.runs ?? baseConfig.runs,
      updates: options?.updates ?? baseConfig.updates,
      mutateCount: options?.mutateCount ?? baseConfig.mutateCount,
    };
    const baseSeed = options?.seed ?? computeSeed(mergedConfig);
    const warmup = options?.warmup ?? 1;
    const items = options?.items ?? createItems(mergedConfig.count, baseSeed);

    // 前回の suite が中断した場合などの保険として先に掃除しておく（この時間は計測に含めない）
    cleanups[key]?.();
    cleanups[key] = undefined;
    updateStatus(key, runCase, '計測中...');
    const updateDurations: number[] = [];
    const mountDurations: number[] = [];
    const cleanupDurations: number[] = [];
    let previousCleanup: (() => void) | undefined;
    for (let i = 0; i < mergedConfig.runs; i += 1) {
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
        updates: mergedConfig.updates,
        mutateCount: mergedConfig.mutateCount,
        seed: baseSeed + i,
        warmup,
        case: runCase,
      });
      updateDurations.push(...outcome.updateDurations);
      mountDurations.push(outcome.mountDuration);
      previousCleanup = outcome.cleanup;
    }

    // 最後の run も必ず後始末して、unmount の統計を runs 回分揃える
    if (previousCleanup) {
      try {
        const start = performance.now();
        previousCleanup();
        cleanupDurations.push(performance.now() - start);
      } catch (error) {
        console.warn('Failed to cleanup last run', error);
      }
    }
    cleanups[key] = undefined;
    const stats: RunnerResult = {
      update: summarizeValues(updateDurations),
      mount: summarizeValues(mountDurations),
      cleanup: cleanupDurations.length ? summarizeValues(cleanupDurations) : undefined,
    };
    updateStatus(
      key,
      runCase,
      formatStats(stats, mergedConfig.runs, mergedConfig.count, mergedConfig.updates, runCase === 'splice' ? 'splice' : 'update')
    );
    return stats;
  };

  const runBatch = async (cases: RunnerCase[]) => {
    const config = getConfig();
    const baseSeed = computeSeed(config);
    const sharedItems = createItems(config.count, baseSeed);
    const order = nextRunnerOrder();
    for (const key of order) {
      for (const runCase of cases) {
        await runSuite(key, { ...config, items: sharedItems, seed: baseSeed, case: runCase });
      }
    }
  };

  const runnerButtons = page.querySelectorAll<HTMLButtonElement>('.bench-runner');
  runnerButtons.forEach((button) => {
    const key = button.getAttribute('data-runner') as RunnerKey | null;
    if (!key) return;
    const runCase = (button.getAttribute('data-case') as RunnerCase | null) ?? 'update';
    button.addEventListener('click', () =>
      runWithBusyGuard(
        async () => {
          await runSuite(key, { case: runCase });
        },
        (error) => {
          console.error(error);
          updateStatus(key, runCase, '計測に失敗しました');
        }
      )
    );
  });

  const runAllButton = document.getElementById('bench-run-all');
  runAllButton?.addEventListener('click', () =>
    runWithBusyGuard(
      async () => {
        await runBatch(['update', 'splice']);
      },
      (error) => {
        console.error(error);
        updateStatuses('計測に失敗しました', ['update', 'splice']);
      }
    )
  );

  const runAllSpliceButton = document.getElementById('bench-run-all-splice');
  runAllSpliceButton?.addEventListener('click', () =>
    runWithBusyGuard(
      async () => {
        await runBatch(['splice']);
      },
      (error) => {
        console.error(error);
        updateStatuses('計測に失敗しました', ['splice']);
      }
    )
  );

  const resetButton = document.getElementById('bench-reset');
  resetButton?.addEventListener('click', () => clearTargets());

  // 初期状態
  clearTargets();
};
