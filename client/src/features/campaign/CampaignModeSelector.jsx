import { KeyRound, Radio } from 'lucide-react';
import { campaignPublishModes } from '@/data/mockCampaigns.js';
import { cx } from '@/lib/cn.js';

export function CampaignModeSelector({ campaignMode, setCampaignMode, setCampaignMessage }) {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2">
      {campaignPublishModes.map((mode) => {
        const isActive = campaignMode === mode.label;
        return (
          <button key={mode.label} type="button" onClick={() => { setCampaignMode(mode.label); setCampaignMessage(`Mode ${mode.label} dipilih.`); }} className={cx('rounded-3xl border p-5 text-left transition', isActive ? 'border-cyan-400 bg-cyan-500/10 shadow-xl shadow-cyan-500/10' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600')}>
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className={cx('flex h-11 w-11 items-center justify-center rounded-2xl', isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300')}>{mode.label === 'Manual (RTMP)' ? <Radio className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}</div><div><h3 className="text-lg font-bold text-white">{mode.label}</h3><p className="text-xs text-slate-500">Mode kampanye</p></div></div><span className={cx('rounded-full px-3 py-1 text-xs font-bold', isActive ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>{mode.badge}</span></div>
            <p className="text-sm leading-relaxed text-slate-400">{mode.description}</p>
          </button>
        );
      })}
    </section>
  );
}
