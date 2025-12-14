import { ref } from 'vue';

export default function Counter() {
  const count = ref(0);
  return (
    <button
      type="button"
      class="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-6 font-medium text-neutral-50 transition active:scale-110"
      onClick={() => (count.value += 1)}
    >
      count: {count.value}
    </button>
  );
}
