import { useEffect, useState } from 'react';
import { Key, Plus, Trash2, Copy, Check, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

/** Modal untuk menampilkan key baru — hanya sekali tampil */
function NewKeyModal({ fullKey, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border border-yellow-500/30 bg-slate-900 shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 ring-1 ring-yellow-500/20">
            <Key className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">API Key Baru Dibuat</h3>
            <p className="text-xs text-yellow-400 font-semibold">⚠ Salin sekarang — tidak bisa dilihat lagi!</p>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="mb-2 text-xs font-medium text-slate-400">Full API Key:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-sm text-yellow-300 select-all">{fullKey}</code>
            <button
              type="button"
              onClick={handleCopy}
              className={cx(
                'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                copied
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              )}
            >
              {copied ? <><Check className="h-3.5 w-3.5 inline mr-1" />Disalin!</> : <><Copy className="h-3.5 w-3.5 inline mr-1" />Salin</>}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300 space-y-1">
          <p className="font-bold">⛔ Peringatan Keamanan:</p>
          <ul className="space-y-0.5 list-disc list-inside text-red-200/80">
            <li>Simpan key ini di tempat yang aman (password manager, .env)</li>
            <li>Jangan commit key ini ke repository</li>
            <li>Key tidak dapat ditampilkan ulang setelah jendela ini ditutup</li>
          </ul>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white"
        >
          Saya sudah menyalin key ini — Tutup
        </Button>
      </div>
    </div>
  );
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ApiKeySettings({ onMessage }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState(null); // full key untuk modal
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.apiKeys.list();
      setApiKeys(res.apiKeys || []);
    } catch (e) {
      onMessage?.(`❌ Gagal memuat API key: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFormName('');
    setFormExpiry('');
    setFormError('');
  };

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('Nama API key wajib diisi.'); return; }

    setFormSaving(true);
    setFormError('');
    try {
      const res = await api.apiKeys.create({
        name: formName.trim(),
        expiresAt: formExpiry || undefined,
      });
      resetForm();
      setShowForm(false);
      setNewKey(res.apiKey.key); // tampilkan modal sekali
      await load();
    } catch (e) {
      setFormError(e.message || 'Gagal membuat API key.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggle = async (key) => {
    try {
      await api.apiKeys.update(key.id, { isActive: !key.isActive });
      await load();
    } catch (e) {
      onMessage?.(`❌ Gagal mengubah status: ${e.message}`);
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Hapus/revoke API key "${key.name}"?\n\nKey yang sudah dihapus tidak dapat digunakan lagi.`)) return;
    setDeleting(key.id);
    try {
      await api.apiKeys.revoke(key.id);
      await load();
      onMessage?.(`API key "${key.name}" berhasil dihapus.`);
    } catch (e) {
      onMessage?.(`❌ Gagal menghapus key: ${e.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      {/* Modal tampilkan key baru */}
      {newKey && <NewKeyModal fullKey={newKey} onClose={() => setNewKey(null)} />}

      <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
                <Key className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">API Key Management</h3>
                <p className="text-sm text-slate-400">Kelola akses programatik ke API Vaimoz LivePilot</p>
              </div>
            </div>
            <Button
              onClick={() => { resetForm(); setShowForm((v) => !v); }}
              className="gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
            >
              {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Tutup Form' : 'Buat API Key Baru'}
            </Button>
          </div>

          {/* Form buat key baru */}
          {showForm && (
            <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-4">
              <h4 className="text-sm font-bold text-white">API Key Baru</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Nama <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Integrasi Zapier"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Kedaluwarsa (opsional)</label>
                  <input
                    type="datetime-local"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3 text-xs text-slate-400">
                💡 Key akan diawali dengan <code className="text-cyan-400 font-mono">vaimoz_</code> dan dapat digunakan di header{' '}
                <code className="text-cyan-400 font-mono">X-Api-Key</code>.
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
                  className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {formSaving ? 'Membuat...' : 'Buat API Key'}
                </Button>
              </div>
            </div>
          )}

          {/* List API keys */}
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Memuat API key…</div>
          ) : apiKeys.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8 text-center">
              <Key className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-500">Belum ada API key. Klik "Buat API Key Baru" untuk memulai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => {
                const expired = isExpired(key.expiresAt);
                return (
                  <div
                    key={key.id}
                    className={cx(
                      'rounded-2xl border p-4 transition',
                      !key.isActive || expired
                        ? 'border-slate-800 bg-slate-900/50 opacity-60'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{key.name}</span>
                          {!key.isActive && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-700 text-slate-400 border border-slate-600">
                              Nonaktif
                            </span>
                          )}
                          {expired && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                              Kedaluwarsa
                            </span>
                          )}
                          {key.isActive && !expired && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                              Aktif
                            </span>
                          )}
                        </div>
                        <code className="mt-1 block font-mono text-xs text-slate-400">
                          {key.keyPrefix}••••••••••••••••••••••••••••••••••••••••••••••••••
                        </code>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>Dibuat: {formatDate(key.createdAt)}</span>
                          {key.lastUsedAt && <span>Terakhir digunakan: {formatDate(key.lastUsedAt)}</span>}
                          {key.expiresAt && (
                            <span className={expired ? 'text-red-400' : 'text-slate-500'}>
                              Kedaluwarsa: {formatDate(key.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle aktif */}
                        <button
                          type="button"
                          onClick={() => handleToggle(key)}
                          disabled={expired}
                          className="text-slate-400 hover:text-white transition disabled:opacity-40"
                          title={key.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {key.isActive
                            ? <ToggleRight className="h-6 w-6 text-green-400" />
                            : <ToggleLeft className="h-6 w-6" />}
                        </button>

                        {/* Hapus/Revoke */}
                        <button
                          type="button"
                          onClick={() => handleDelete(key)}
                          disabled={deleting === key.id}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3 inline mr-1" />
                          {deleting === key.id ? 'Menghapus...' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info penggunaan */}
          <div className="mt-5 rounded-xl bg-slate-800/50 border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Cara menggunakan API Key:</p>
            <code className="block bg-slate-900 rounded-lg px-3 py-2 font-mono text-cyan-400">
              curl -H "X-Api-Key: vaimoz_..." https://your-server/api/...
            </code>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
