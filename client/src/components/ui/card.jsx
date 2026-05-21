import { cx } from '@/lib/cn.js';

export function Card({ className = '', children, style = {}, ...props }) {
  return (
    <div 
      className={cx('rounded-2xl border transition-all duration-300', className)} 
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return <div className={cx('p-5', className)} {...props}>{children}</div>;
}

