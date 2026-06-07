import { useEffect, useState } from 'react';
import { BookMarked, Trash2, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

/**
 * Modal untuk memilih template campaign.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onApply — dipanggil dengan campaign yang baru dibuat dari template
 * @param {number|null} currentCampaignId — jika ada, tampilkan tombol "Simpan sebagai Template"
 * @param {string} currentCampaignName — nama campaign aktif
 */
export function TemplateModal({ isOpen, onClose, onApply, currentCampaignId, currentCampaignName }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await api.templates.list();
      setTemplates(result.templates || []);
    } catch (err) {
      setMessage(`Gagal memuat template: ${err instanceof Error ? err.message : 'Error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSaveTemplateName(currentCampaignName || '');
      setSaveTemplateDesc('');
      setShowSaveForm(false);
      setMessage('');
    }
  }, [isOpen, currentCampaignName]);

  const handleApply = async (template) => {
    try {
      setMessage(`Membuat kampanye dari template "${template.name}"...`);
      const result = await api.templates.apply(template.id, `${template.name} (Baru)`);
      onApply?.(result.campaign);
      onClose();
    } catch (err) {
      setMessage(`Gagal menerapkan template: ${err instanceof Error ? err.message : 'Error.'}`);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Hapus template "${template.name}"?`)) return;
    try {
      await api.templates.remove(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      setMessage(`Template "${template.name}" dihapus.`);
    } catch (err) {
      setMessage(`Gagal menghapus: ${err instanceof Error ? err.message : 'Error.'}`);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentCampaignId) return;
    if (!saveTemplateName.trim()) {
      setMessage('⚠ Nama template wajib diisi.');
      return;
    }
    setIsSaving(true);
    try {
      await api.campaigns.saveAsTemplate(currentCampaignId, saveTemplateName.trim(), saveTemplateDesc.trim());
      setMessage(`✅ Kampanye disimpan sebagai template "${saveTemplateName}".`);
      setShowSaveForm(false);
      await loadTemplates();
    } catch (err) {
      setMessage(`Gagal: ${err instanceof Error ? err.message : 'Error.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <Card className="w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl shadow-black/80 bg-slate-900 border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <BookMarked className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Template Kampanye</h3>
              <p className="text-xs text-slate-400">Buat kampanye baru dari template tersimpan</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mx-6 mt-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-2.5 text-xs text-cyan-300">
            {message}
          </div>
        )}

        {/* Save as template (jika ada campaign aktif) */}
        {currentCampaignId && (
          <div className="px-6 pt-4">
            {!showSaveForm ? (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Simpan kampanye ini sebagai template baru
              </button>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-400">Simpan sebagai Template</p>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="Nama template"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={saveTemplateDesc}
                  onChange={(e) => setSaveTemplateDesc(e.target.value)}
                  placeholder="Deskripsi (opsional)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveAsTemplate}
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button
                    onClick={() => setShowSaveForm(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Template List */}
        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Template Tersimpan ({templates.length})
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Memuat template...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-700 py-8 text-center">
              <BookMarked className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-500">Belum ada template tersimpan</p>
              <p className="text-xs text-slate-600 mt-1">Simpan kampanye sebagai template untuk digunakan kembali</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 px-4 py-3 hover:border-slate-600 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{template.name}</p>
                      {template.isDefault && (
                        <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{template.mode}</span>
                      {template.description && (
                        <span className="text-xs text-slate-600 truncate">— {template.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Button
                      onClick={() => handleApply(template)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 h-auto"
                    >
                      Gunakan
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4 flex justify-end">
          <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white">
            Tutup
          </Button>
        </div>
      </Card>
    </div>
  );
}
