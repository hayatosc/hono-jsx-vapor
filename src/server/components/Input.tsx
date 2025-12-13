/** @jsxImportSource hono/jsx */

type InputProps = {
  id?: string;
  name?: string;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  class?: string;
  [key: string]: unknown;
};

const baseStyles =
  'w-full rounded-lg border border-slate-200/50 bg-white/10 px-2.5 py-2 text-slate-50 outline-none focus:ring-2 focus:ring-slate-400/60 focus:border-slate-200/80';

export const Input = ({ class: className, ...props }: InputProps) => {
  const combinedClass = [baseStyles, className].filter(Boolean).join(' ');

  return <input class={combinedClass} {...props} />;
};
