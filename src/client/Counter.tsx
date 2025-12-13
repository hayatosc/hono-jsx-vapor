import { ref } from 'vue';

export default function Counter() {
  const count = ref(0);
  return (
    <button type="button" onClick={() => (count.value += 1)}>
      count: {count.value}
    </button>
  );
}
