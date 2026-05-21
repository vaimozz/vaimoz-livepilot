import { Database, ShieldCheck } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { menuItems } from '@/data/navigation.jsx';

export function Sidebar({ activePage, setActivePage }) {
  return (
    <aside 
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r p-5 lg:block transition-all duration-300"
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <nav 
        className="space-y-2 rounded-3xl border p-2"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.label;
          return (
            <button 
              key={item.label} 
              type="button" 
              onClick={() => setActivePage(item.label)} 
              className={cx('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02]')}
              style={isActive ? {
                color: 'var(--accent-primary)',
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)',
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              <Icon className="h-4 w-4" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div 
        className="mt-5 rounded-3xl border p-4 transition-all duration-300"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck className="h-4 w-4" style={{ color: 'var(--success)' }} /> Status API
        </div>
        <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex justify-between"><span>YouTube API v3</span><span style={{ color: 'var(--warning)' }}>Belum dicek</span></div>
          <div className="flex justify-between"><span>Facebook Live API</span><span style={{ color: 'var(--warning)' }}>Belum dikonfigurasi</span></div>
          <div className="flex justify-between"><span>FFmpeg Runner</span><span style={{ color: 'var(--text-secondary)' }}>Idle</span></div>
        </div>
      </div>
      <div 
        className="mt-5 rounded-3xl border p-4 transition-all duration-300"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Database className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} /> Penyimpanan Lokal
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="h-full w-0 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Belum ada aset tersimpan</p>
      </div>
    </aside>
  );
}

