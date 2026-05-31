import { cx } from '@/lib/cn.js';
import { menuItems } from '@/data/navigation.jsx';

export function MobileNav({ activePage, setActivePage }) {
  const mainItems = menuItems;

  return (
    <div className="glass-header fixed bottom-0 left-0 z-50 flex w-full overflow-x-auto p-3 pb-safe lg:hidden hide-scrollbar gap-4 px-4">
      {mainItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.label;
        return (
          <button
            key={item.label}
            onClick={() => setActivePage(item.label)}
            className={cx(
              'flex flex-col items-center gap-1 rounded-xl p-2 transition-all min-w-[64px]',
              isActive ? 'text-indigo-400 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-medium tracking-tight">
              {item.label === 'Kampanye Live' ? 'Live' : item.label === 'Recurring Schedule' ? 'Jadwal' : item.label === 'Pustaka Aset' ? 'Aset' : item.label === 'Monitor Stream' ? 'Monitor' : item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
