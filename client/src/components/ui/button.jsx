import { cx } from '@/lib/cn.js';

export function Button({ className = '', variant = 'default', type = 'button', children, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    default: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
    outline: 'border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800',
  };
  return (
    <button type={type} className={cx(base, variants[variant] || variants.default, className)} {...props}>
      {children}
    </button>
  );
}
