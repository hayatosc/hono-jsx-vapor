import { ref } from 'vue';

export default function Counter() {
  const count = ref(0);
  return (
    <button
      type="button"
      class="rounded-xl px-3.5 py-2.5 bg-slate-900 text-slate-50 font-semibold shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-400/60"
      onClick={() => (count.value += 1)}
    >
      count: {count.value}
    </button>
  );
}
