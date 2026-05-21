import { cx } from '@/lib/cn.js';

export function Button({ className = '', variant = 'default', type = 'button', children, style = {}, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]';
  
  let inlineStyle = { ...style };

  if (variant === 'default') {
    inlineStyle = {
      backgroundColor: 'var(--accent-primary)',
      color: 'var(--bg-primary)',
      border: '1px solid var(--accent-primary)',
      boxShadow: '0 4px 12px color-mix(in srgb, var(--accent-primary) 20%, transparent)',
      ...inlineStyle
    };
  } else if (variant === 'outline') {
    inlineStyle = {
      border: '1px solid var(--border-primary)',
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
      ...inlineStyle
    };
  }

  return (
    <button 
      type={type} 
      className={cx(base, className)} 
      style={inlineStyle} 
      {...props}
    >
      {children}
    </button>
  );
}

