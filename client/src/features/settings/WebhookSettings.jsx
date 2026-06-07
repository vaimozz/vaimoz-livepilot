import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, Send, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

const SUPPORTED_EVENTS = [
  { key: 'stream.start',       label: 'Stream Mulai' },
  { key: 'stream.stop',        label: 'Stream Berhenti' },
  { key: 'stream.error',       label: 'Stream Error' },
  { key: 'broadcast.live',     label: 'Broadcast Live' },
  { key: 'viewer.milestone',   label: 'Milestone Penonton' },
  { key: 'campaign.scheduled', label: 'Kampanye Dijadwalkan' },
  { key: 'campaign.completed', label: 'Kampanye Selesai' },
];

function StatusBadge({ status }) {
  if (status === null || status === undefined) {
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-700 text-slate-400">Belum Pernah</span>;
  }
  if (status >= 200 && status < 300) {
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30">{status} OK</span>;
  }
  if (status >= 400 && status < 500) {
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{status}</span>;
  }
  if (status >= 500) {
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">{status}</span>;
  }
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">Gagal</span>;
}

function truncateUrl(url, maxLen = 45) {
  if (!url) return '';
  return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
}

export function WebhookSettings({ onMessage }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEvents, setFormEvents] = useState([]);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.webhooks.list();
      setWebhooks(res.webhooks || []);
    } catch (e) {
      onMessage?.(`❌ Gagal memuat webhook: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (eventKey) => {
    setFormEvents((prev) =>
      prev.includes(eventKey) ? prev.filter((e) => e !== eventKey) : [...prev, eventKey]
    );
  };

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormSecret('');
    setFormEvents([]);
    setFormError('');
  };

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('Nama wajib diisi.'); return; }
    if (!formUrl.trim()) { setFormError('URL wajib diisi.'); return; }
    if (!formUrl.trim().startsWith('http')) { setFormError('URL harus dimulai dengan http:// atau https://'); return; }
    if (formEvents.length === 0) { setFormError('Pilih minimal satu event.'); return; }

    setFormSaving(true);
    setFormError('');
    try {
      await api.webhooks.create({
        name: formName.trim(),
        url: formUrl.trim(),
        secret: formSecret.trim() || undefined,
        events: formEvents,
        isActive: true,
      });
      resetForm();
      setShowForm(false);
      await load();
      onMessage?.('✅ Webhook berhasil dibuat.');
    } catch (e) {
      setFormError(e.message || 'Gagal membuat webhook.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggle = async (wh) => {
    try {
      await api.webhooks.update(wh.id, { isActive: !wh.isActive });
      await load();
    } catch (e) {
      onMessage?.(`❌ Gagal mengubah status: ${e.message}`);
    }
  };

  const handleTest = async (wh) => {
    setTesting(wh.id);
    try {
      const res = await api.webhooks.test(wh.id);
      onMessage?.(`✅ Test webhook "${wh.name}": HTTP ${res.status}`);
      await load();
    } catch (e) {
      onMessage?.(`❌ Test gagal "${wh.name}": ${e.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (wh) => {
    if (!window.confirm(`Hapus webhook "${wh.name}"?`)) return;
    setDeleting(wh.id);
    try {
      await api.webhooks.remove(wh.id);
      await load();
      onMessage?.(`Webhook "${wh.name}" dihapus.`);
    } catch (e) {
      onMessage?.(`❌ Gagal menghapus: ${e.message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
      <CardContent className="p-6">
        {/* Header section */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/20">
              <Globe className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Webhook Outbound</h3>
              <p className="text-sm text-slate-400">Kirim notifikasi ke URL eksternal saat event terjadi</p>
            </div>
          </div>
          <Button
            onClick={() => { resetForm(); setShowForm((v) => !v); }}
            className="gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Tutup Form' : 'Tambah Webhook'}
          </Button>
        </div>

        {/* Form tambah webhook */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4">
            <h4 className="text-sm font-bold text-white">Webhook Baru</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nama <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Notifikasi Slack"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">URL Endpoint <span className="text-red-400">*</span></label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Secret (opsional)</label>
              <input
                type="password"
                placeholder="Digunakan untuk HMAC-SHA256 signature di header X-Vaimoz-Signature"
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Events <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUPPORTED_EVENTS.map((ev) => (
                  <label key={ev.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs hover:border-orange-400/40 transition">
                    <input
                      type="checkbox"
                      checked={formEvents.includes(ev.key)}
                      onChange={() => toggleEvent(ev.key)}
                      className="accent-orange-400"
                    />
                    <span className="text-slate-300">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{formError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => { resetForm(); setShowForm(false); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </Button>
              <Button
                onClick={handleCreate}
                disabled={formSaving}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {formSaving ? 'Menyimpan...' : 'Buat Webhook'}
              </Button>
            </div>
          </div>
        )}

        {/* List webhook */}
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Memuat webhook…</div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Belum ada webhook. Klik "Tambah Webhook" untuk memulai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className={cx(
                  'rounded-2xl border p-4 transition',
                  wh.isActive
                    ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    : 'border-slate-800 bg-slate-900/50 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{wh.name}</span>
                      {wh.hasSecret && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          🔐 Signed
                        </span>
                      )}
                      <StatusBadge status={wh.lastStatus} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400 truncate" title={wh.url}>
                      {truncateUrl(wh.url)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(wh.events || []).map((ev) => {
                        const label = SUPPORTED_EVENTS.find((e) => e.key === ev)?.label || ev;
                        return (
                          <span key={ev} className="rounded-md bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    {wh.lastTriggeredAt && (
                      <p className="mt-1.5 text-[11px] text-slate-600">
                        Terakhir dikirim: {new Date(wh.lastTriggeredAt).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle aktif */}
                    <button
                      type="button"
                      onClick={() => handleToggle(wh)}
                      className="text-slate-400 hover:text-white transition"
                      title={wh.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {wh.isActive
                        ? <ToggleRight className="h-6 w-6 text-green-400" />
                        : <ToggleLeft className="h-6 w-6" />}
                    </button>

                    {/* Test */}
                    <button
                      type="button"
                      onClick={() => handleTest(wh)}
                      disabled={testing === wh.id}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-orange-400/40 hover:text-orange-300 transition disabled:opacity-50"
                    >
                      {testing === wh.id ? (
                        <Send className="h-3 w-3 animate-pulse inline" />
                      ) : (
                        <><Send className="h-3 w-3 inline mr-1" />Test</>
                      )}
                    </button>

                    {/* Hapus */}
                    <button
                      type="button"
                      onClick={() => handleDelete(wh)}
                      disabled={deleting === wh.id}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:border-red-400/40 hover:text-red-400 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
