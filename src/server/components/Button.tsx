/** @jsxImportSource hono/jsx */

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = {
  variant?: ButtonVariant
  type?: 'button' | 'submit' | 'reset'
  class?: string
  children?: unknown
  [key: string]: unknown
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-slate-50 font-semibold shadow-sm hover:-translate-y-px hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white text-slate-900 font-semibold border border-slate-900/10 shadow-sm hover:-translate-y-px hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-white/10 text-slate-200 border border-slate-200/20 font-semibold hover:-translate-y-px hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
}

const baseStyles = 'rounded-xl px-3.5 py-2.5 transition duration-150 ease-out'

export const Button = ({
  variant = 'primary',
  type = 'button',
  class: className,
  children,
  ...props
}: ButtonProps) => {
  const variantClass = variantStyles[variant]
  const combinedClass = [baseStyles, variantClass, className].filter(Boolean).join(' ')

  return (
    <button type={type} class={combinedClass} {...props}>
      {children}
    </button>
  )
}
