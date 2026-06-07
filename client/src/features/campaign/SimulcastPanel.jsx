import { useState } from 'react';
import { Plus, Trash2, Radio, Tv2, PlayCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

const PLATFORM_PRESETS = [
  {
    name: 'YouTube',
    icon: PlayCircle,
    color: 'text-red-400',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
  },
  {
    name: 'Facebook Live',
    icon: Share2,
    color: 'text-blue-400',
    rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKey: '',
  },
  {
    name: 'Twitch',
    icon: Tv2,
    color: 'text-purple-400',
    rtmpUrl: 'rtmp://live.twitch.tv/app/',
    streamKey: '',
  },
  {
    name: 'TikTok Live',
    icon: Radio,
    color: 'text-pink-400',
    rtmpUrl: 'rtmp://push.tiktokv.com/liveapp/',
    streamKey: '',
  },
];

function TargetRow({ target, index, onChange, onRemove, isOnly }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">Target #{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={isOnly}
          className={cx(
            'rounded-lg p-1 transition',
            isOnly ? 'text-slate-700 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/10'
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Nama Platform</label>
        <input
          type="text"
          value={target.name}
          onChange={(e) => onChange({ ...target, name: e.target.value })}
          placeholder="YouTube, Facebook, Twitch..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">RTMP URL</label>
        <input
          type="text"
          value={target.rtmpUrl}
          onChange={(e) => onChange({ ...target, rtmpUrl: e.target.value })}
          placeholder="rtmp://..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Stream Key</label>
        <input
          type="password"
          value={target.streamKey}
          onChange={(e) => onChange({ ...target, streamKey: e.target.value })}
          placeholder="Stream key platform"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Panel simulcast yang diintegrasikan ke CampaignPage.
 * @param {number|null} campaignId — ID campaign yang sudah disimpan
 * @param {function} onMessage — callback untuk menampilkan pesan status
 */
export function SimulcastPanel({ campaignId, onMessage }) {
  const [enabled, setEnabled] = useState(false);
  const [targets, setTargets] = useState([
    { name: 'YouTube', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: '' },
    { name: 'Facebook Live', rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/', streamKey: '' },
  ]);
  const [isStarting, setIsStarting] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState(null);

  const addTarget = () => {
    if (targets.length >= 5) return;
    setTargets((prev) => [...prev, { name: '', rtmpUrl: '', streamKey: '' }]);
  };

  const addPreset = (preset) => {
    if (targets.length >= 5) return;
    setTargets((prev) => [...prev, { name: preset.name, rtmpUrl: preset.rtmpUrl, streamKey: '' }]);
  };

  const updateTarget = (index, updated) => {
    setTargets((prev) => prev.map((t, i) => (i === index ? updated : t)));
  };

  const removeTarget = (index) => {
    if (targets.length <= 2) return;
    setTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const startSimulcast = async () => {
    if (!campaignId) {
      onMessage?.('⚠ Simpan draft kampanye terlebih dahulu sebelum memulai simulcast.');
      return;
    }
    const validTargets = targets.filter((t) => t.rtmpUrl.trim());
    if (validTargets.length < 2) {
      onMessage?.('⚠ Isi minimal 2 RTMP URL target untuk simulcast.');
      return;
    }

    setIsStarting(true);
    onMessage?.('Memulai simulcast ke ' + validTargets.length + ' platform...');
    try {
      const result = await api.campaigns.startSimulcast(campaignId, validTargets);
      setActiveStreamId(result.streamId);
      onMessage?.(`🔴 Simulcast dimulai! Stream #${result.streamId} → ${validTargets.map((t) => t.name).join(', ')}`);
    } catch (err) {
      onMessage?.(`❌ Gagal memulai simulcast: ${err instanceof Error ? err.message : 'Error tidak dikenal.'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const stopSimulcast = async () => {
    if (!campaignId) return;
    try {
      await api.campaigns.stop(campaignId);
      setActiveStreamId(null);
      onMessage?.('⏹ Simulcast berhasil dihentikan.');
    } catch (err) {
      onMessage?.(`Gagal menghentikan simulcast: ${err instanceof Error ? err.message : 'Error.'}`);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
            <Radio className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Multi-Platform Simulcast</h4>
            <p className="text-xs text-slate-500">Streaming ke banyak platform sekaligus</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={cx(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            enabled ? 'bg-purple-500' : 'bg-slate-700'
          )}
        >
          <span className={cx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      {!enabled && (
        <p className="text-xs text-slate-500 pl-12">Aktifkan untuk streaming ke banyak platform secara bersamaan.</p>
      )}

      {enabled && (
        <>
          {/* Preset buttons */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Tambah preset cepat:</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addPreset(preset)}
                    disabled={targets.length >= 5}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon className={cx('h-3 w-3', preset.color)} />
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target list */}
          <div className="space-y-3">
            {targets.map((target, i) => (
              <TargetRow
                key={i}
                target={target}
                index={i}
                onChange={(updated) => updateTarget(i, updated)}
                onRemove={() => removeTarget(i)}
                isOnly={targets.length <= 2}
              />
            ))}
          </div>

          {/* Add target button */}
          {targets.length < 5 && (
            <button
              type="button"
              onClick={addTarget}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 py-3 text-sm text-slate-500 hover:border-slate-500 hover:text-slate-300 transition"
            >
              <Plus className="h-4 w-4" />
              Tambah Target ({targets.length}/5)
            </button>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 border-t border-slate-800">
            {activeStreamId ? (
              <Button
                onClick={stopSimulcast}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              >
                ⏹ Stop Simulcast
              </Button>
            ) : (
              <Button
                onClick={startSimulcast}
                disabled={isStarting || !campaignId}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isStarting ? 'Memulai...' : `🔴 Mulai Simulcast (${targets.filter((t) => t.rtmpUrl).length} target)`}
              </Button>
            )}
          </div>

          {!campaignId && (
            <p className="text-xs text-amber-400/70">⚠ Simpan draft kampanye terlebih dahulu untuk mengaktifkan simulcast.</p>
          )}
        </>
      )}
    </div>
  );
}
