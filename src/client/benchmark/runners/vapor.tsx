/** @jsxImportSource vue-jsx-vapor */
// @ts-nocheck - v-for syntax is not recognized by TypeScript but processed by Vue JSX Vapor compiler
import { createVaporApp, nextTick, ref, type Ref } from 'vue'
import type { BenchItem, RunOutcome, RunnerOptions } from '../types'
import { createMutator, createSpliceMutator } from '../utils/data'
import { createRunnerContext, measureMount, nextPaint, safeCleanup } from './helpers'

const VaporBenchApp =
  (initialItems: BenchItem[], itemsRef: { current: Ref<BenchItem[]> | null }) => () => {
    const state = ref(initialItems)
    itemsRef.current = state

    return (
      <ul class="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-1.5">
        <li
          class="grid grid-cols-[56px_1fr_auto] items-center gap-2 p-2.5 rounded-lg bg-slate-900/5"
          v-for={(item, index) in state.value}
          key={item.id}
        >
          <span class="text-slate-400 text-[13px]">#{item.id + 1}</span>
          <span class="font-semibold">{item.label}</span>
          <span class="font-mono tabular-nums text-cyan-500">{item.value}</span>
        </li>
      </ul>
    )
  }

export const runVapor = async (
  target: HTMLElement,
  items: BenchItem[],
  options: RunnerOptions
): Promise<RunOutcome> => {
  const { mountPoint, updates, mutateCount, seed, warmup, runCase } = createRunnerContext(
    target,
    items,
    options
  )
  const mutate =
    runCase === 'splice'
      ? createSpliceMutator(seed, items.length)
      : createMutator(mutateCount, seed)

  const itemsRef: { current: Ref<BenchItem[]> | null } = { current: null }
  const app = createVaporApp(VaporBenchApp(items, itemsRef))

  const mountDuration = await measureMount(() => app.mount(mountPoint))

  if (!itemsRef.current) {
    throw new Error('Failed to initialize Vapor component state')
  }

  const stateRef = itemsRef.current
  let current = items

  // Warmup: eliminate initial rendering costs from measurements
  for (let i = 0; i < warmup; i++) {
    current = mutate(current)
    stateRef.value = current
    await nextTick()
    await nextPaint()
  }

  // Measured updates
  const durations: number[] = []
  for (let i = 0; i < updates; i++) {
    current = mutate(current)
    const start = performance.now()
    stateRef.value = current
    await nextTick()
    await nextPaint()
    durations.push(performance.now() - start)
  }

  return {
    mountDuration,
    updateDurations: durations,
    cleanup: () => {
      safeCleanup(
        () => {
          if (mountPoint.parentNode) {
            app.unmount()
          }
        },
        (error) => {
          const message = error instanceof Error ? error.message : String(error)
          return message.includes("reading 'parent'")
        }
      )
      target.replaceChildren()
    },
  }
}
