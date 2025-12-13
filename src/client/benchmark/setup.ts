import { runHonoDom } from './runners/hono-dom';
import { runVapor } from './runners/vapor';
import type { BenchItem, RunnerCase, RunnerKey, RunnerOptions, RunnerResult, RunOutcome } from './types';
import { createItems } from './utils/data';
import { computeSeed, formatStats, summarizeValues } from './utils/stats';
import { clearRunner, clearTargets, coerceNumber, RESET_MESSAGE, runWithBusyGuard, updateStatus, updateStatuses } from './utils/ui';

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
  const busyState = { value: false };

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

    // Clean up any previous suite runs before starting (this time is not included in measurements)
    cleanups[key]?.();
    cleanups[key] = undefined;
    updateStatus(statEls, key, runCase, '計測中...');
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
      statEls,
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
        page,
        busyState,
        async () => {
          await runSuite(key, { case: runCase });
        },
        (error) => {
          console.error(error);
          updateStatus(statEls, key, runCase, '計測に失敗しました');
        }
      )
    );
  });

  const runAllButton = document.getElementById('bench-run-all');
  runAllButton?.addEventListener('click', () =>
    runWithBusyGuard(
      page,
      busyState,
      async () => {
        await runBatch(['update', 'splice']);
      },
      (error) => {
        console.error(error);
        updateStatuses(statEls, runnerKeys, ['update', 'splice'], '計測に失敗しました');
      }
    )
  );

  const runAllSpliceButton = document.getElementById('bench-run-all-splice');
  runAllSpliceButton?.addEventListener('click', () =>
    runWithBusyGuard(
      page,
      busyState,
      async () => {
        await runBatch(['splice']);
      },
      (error) => {
        console.error(error);
        updateStatuses(statEls, runnerKeys, ['splice'], '計測に失敗しました');
      }
    )
  );

  const resetButton = document.getElementById('bench-reset');
  resetButton?.addEventListener('click', () => clearTargets(targetEls, cleanups, statEls, runnerKeys, CASES));

  // Initialize with clean state
  clearTargets(targetEls, cleanups, statEls, runnerKeys, CASES);
};
