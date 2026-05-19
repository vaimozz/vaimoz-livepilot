import { cx } from '@/lib/cn.js';
import { getPlatformBadgeClass, getStatusClass } from '@/lib/styleUtils.js';

export function PlatformBadge({ platform }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', getPlatformBadgeClass(platform))}>{platform}</span>;
}

export function StatusPill({ status }) {
  return <span className={cx('rounded-full px-3 py-1 text-xs', getStatusClass(status))}>{status}</span>;
}
