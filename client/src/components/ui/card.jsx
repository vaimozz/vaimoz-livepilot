import { cx } from '@/lib/cn.js';

export function Card({ className = '', children }) {
  return <div className={cx('rounded-xl border border-slate-800 bg-slate-900/70', className)}>{children}</div>;
}

export function CardContent({ className = '', children }) {
  return <div className={cx('p-4', className)}>{children}</div>;
}
