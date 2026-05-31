import { cx } from '@/lib/cn.js';
import { menuItems } from '@/data/navigation.jsx';

export function MobileNav({ activePage, setActivePage }) {
  // Hanya ambil 4-5 menu utama untuk bottom nav agar tidak penuh
  const mainItems = menuItems.slice(0, 5);

  return (
    <div className="glass-header fixed bottom-0 left-0 z-50 flex w-full justify-around p-3 pb-safe lg:hidden">
      {mainItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.label;
        return (
          <button
            key={item.label}
            onClick={() => setActivePage(item.label)}
            className={cx(
              'flex flex-col items-center gap-1 rounded-xl p-2 transition-all',
              isActive ? 'text-indigo-400 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-medium tracking-tight">
              {item.label === 'Kampanye Live' ? 'Live' : item.label === 'Recurring Schedule' ? 'Jadwal' : item.label === 'Pustaka Aset' ? 'Aset' : item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
