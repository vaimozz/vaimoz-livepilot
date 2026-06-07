import { useEffect, useMemo, useState } from 'react';
import { Bell, Database, Download, KeyRound, RefreshCw, Save, Send, Server, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { facebookIntegrationChecklist } from '@/data/integrations.js';
import { api } from '@/lib/api.js';
import { WebhookSettings } from './WebhookSettings.jsx';
import { ApiKeySettings } from './ApiKeySettings.jsx';

function channelInitial(ch) {
  return ch.avatar || ch.title?.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'YT';
}

export function SettingsPage() {
  const [redirectUri] = useState(() => `${window.location.origin}/api/youtube/callback`);
  const [connectedChannels, setConnectedChannels] = useState([]);
  const [settingsMessage, setSettingsMessage] = useState('Memuat pengaturan...');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Google API
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  // Gemini API
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiApiUrl, setGeminiApiUrl] = useState('');
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    notifyStreamStart: true, notifyStreamStop: true, notifyStreamError: true,
    notifyViewerMilestone: true, notifySmartStop: true, notifyBroadcastLive: true,
    viewerMilestoneThreshold: 100,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Facebook
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookPageToken, setFacebookPageToken] = useState('');
  const [facebookStatus, setFacebookStatus] = useState('Belum dikonfigurasi');

  // Backup & Restore
  const [backupStatus, setBackupStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadBackupStatus = async () => {
    try {
      const result = await api.backup.status();
      setBackupStatus(result);
    } catch { /* ok */ }
  };

  const loadSettings = async () => {
    try {
      const [sr, pr] = await Promise.all([api.settings.get(), api.settings.getNotifPrefs()]);
      const s = sr.settings || {};
      setTelegramSaved(s.telegram_bot_token?.set === true);
      if (typeof s.telegram_chat_id === 'string') setTelegramChatId(s.telegram_chat_id);

      setGoogleConfigured(s.google_client_id?.set === true || s._env?.hasGoogleClientId === true);
      setGeminiConfigured(s.gemini_api_key?.set === true || s._env?.hasGeminiApiKey === true);
      if (typeof s.gemini_api_url === 'string') setGeminiApiUrl(s.gemini_api_url);

      setNotifPrefs(pr);
    } catch { /* settings table mungkin kosong */ }
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const result = await api.youtube.channels();
      setConnectedChannels(result.channels || []);
      setSettingsMessage(`${result.channels?.length || 0} channel YouTube terbaca.`);
    } catch (e) {
      setSettingsMessage(`Gagal membaca channel: ${e instanceof Error ? e.message : 'Error.'}`);
    } finally { setIsLoadingChannels(false); }
  };

  useEffect(() => { loadChannels(); loadSettings(); loadBackupStatus(); }, []);

  const addChannel = async () => {
    try {
      const r = await api.youtube.authUrl();
      if (r.url) { window.location.href = r.url; return; }
      setSettingsMessage('Backend tidak mengembalikan URL OAuth. Cek .env.');
    } catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
  };

  const setDefaultChannel = async (id) => {
    try { await api.youtube.setDefaultChannel(id); await loadChannels(); setSettingsMessage('Channel default diperbarui.'); }
    catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
  };

  const deleteChannel = async (ch) => {
    try { await api.youtube.removeChannel(ch.id); await loadChannels(); setSettingsMessage(`${ch.title} dihapus.`); }
    catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
  };

  const disconnectAllChannels = async () => {
    try {
      await Promise.all(connectedChannels.map((ch) => api.youtube.removeChannel(ch.id)));
      await loadChannels(); setSettingsMessage('Semua channel diputuskan.');
    } catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
  };

  const saveGoogleApi = async () => {
    setIsSavingGoogle(true);
    try {
      // Gunakan endpoint khusus /settings/google/save agar tidak terkena allowlist filter
      await api.settings.saveGoogle(
        googleClientId.trim() || undefined,
        googleClientSecret.trim() || undefined,
        redirectUri
      );
      setSettingsMessage('✅ Kredensial Google API disimpan.');
      await loadSettings();
      setGoogleClientId('');
      setGoogleClientSecret('');
    } catch (e) {
      setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`);
    } finally {
      setIsSavingGoogle(false);
    }
  };

  const handleGoogleJsonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const credentials = json.web || json.installed;
        if (credentials && credentials.client_id && credentials.client_secret) {
          setGoogleClientId(credentials.client_id);
          setGoogleClientSecret(credentials.client_secret);
          setSettingsMessage('✅ File JSON berhasil dibaca. Silakan klik "Simpan Kredensial".');
        } else {
          setSettingsMessage('⚠ File JSON tidak memiliki client_id atau client_secret yang valid.');
        }
      } catch (error) {
        setSettingsMessage('⚠ Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const saveGeminiApi = async () => {
    setIsSavingGemini(true);
    try {
      // Gunakan endpoint khusus /settings/gemini/save agar tidak terkena allowlist filter
      await api.settings.saveGemini(
        geminiApiKey.trim(),
        geminiApiUrl.trim()
      );
      setSettingsMessage('✅ Konfigurasi Gemini API disimpan.');
      await loadSettings();
      setGeminiApiKey('');
    } catch (e) {
      setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`);
    } finally {
      setIsSavingGemini(false);
    }
  };

  const saveTelegram = async () => {
    if (!telegramBotToken.trim()) return setSettingsMessage('⚠ Bot Token wajib diisi.');
    if (!telegramChatId.trim()) return setSettingsMessage('⚠ Chat ID wajib diisi.');
    setIsSavingTelegram(true);
    try {
      await api.settings.saveTelegram(telegramBotToken.trim(), telegramChatId.trim());
      setTelegramSaved(true); setTelegramBotToken('');
      setSettingsMessage('✅ Telegram credentials disimpan ke database.');
    } catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
    finally { setIsSavingTelegram(false); }
  };

  const testTelegram = async () => {
    if (!telegramBotToken.trim() && !telegramSaved) return setSettingsMessage('⚠ Isi Bot Token terlebih dahulu.');
    if (!telegramChatId.trim()) return setSettingsMessage('⚠ Isi Chat ID terlebih dahulu.');
    setIsTesting(true); setSettingsMessage('Mengirim pesan test...');
    try {
      const r = await api.settings.testTelegram(telegramBotToken.trim() || undefined, telegramChatId.trim());
      setSettingsMessage(r.message || '✅ Pesan test berhasil dikirim!');
    } catch (e) { setSettingsMessage(`❌ Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
    finally { setIsTesting(false); }
  };

  const deleteTelegram = async () => {
    try {
      await api.settings.deleteTelegram();
      setTelegramSaved(false); setTelegramBotToken(''); setTelegramChatId('');
      setSettingsMessage('Telegram credentials dihapus.');
    } catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
  };

  const saveNotifPrefs = async () => {
    setIsSavingPrefs(true);
    try { await api.settings.saveNotifPrefs(notifPrefs); setSettingsMessage('✅ Preferensi notifikasi disimpan.'); }
    catch (e) { setSettingsMessage(`Gagal: ${e instanceof Error ? e.message : 'Error.'}`); }
    finally { setIsSavingPrefs(false); }
  };

  const saveFacebook = () => {
    if (!facebookAppId.trim() || !facebookAppSecret.trim() || !facebookPageId.trim() || !facebookPageToken.trim()) {
      setFacebookStatus('Belum lengkap'); setSettingsMessage('Lengkapi semua field Facebook.'); return;
    }
    setFacebookStatus('Tersimpan lokal'); setSettingsMessage('Konfigurasi Facebook disimpan lokal.');
  };

  const exportBackup = async () => {
    setIsExporting(true);
    setSettingsMessage('Menyiapkan file backup...');
    try {
      await api.backup.export();
      setSettingsMessage('✅ Backup berhasil diunduh.');
    } catch (err) {
      setSettingsMessage(`❌ Gagal export backup: ${err instanceof Error ? err.message : 'Error.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Import backup akan menimpa data campaign, playlist, dan settings yang ada (dengan nama sama). Lanjutkan?')) {
      e.target.value = '';
      return;
    }
    setIsImporting(true);
    setSettingsMessage('Memproses file backup...');
    try {
      const result = await api.backup.import(file);
      setSettingsMessage(`✅ Backup berhasil dipulihkan! ${result.imported.campaigns} campaign, ${result.imported.playlists} playlist, ${result.imported.settings} settings.`);
      await loadBackupStatus();
    } catch (err) {
      setSettingsMessage(`❌ Gagal import: ${err instanceof Error ? err.message : 'Error.'}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const youtubeStatus = connectedChannels.length > 0 ? 'Terhubung' : 'Belum terhubung';
  const statusRows = useMemo(() => [
    { label: 'YouTube API v3', value: youtubeStatus, active: connectedChannels.length > 0 },
    { label: 'OAuth Redirect URI', value: redirectUri ? 'Tersedia' : 'Belum', active: Boolean(redirectUri) },
    { label: 'Token Tersimpan', value: connectedChannels.length > 0 ? 'Ada' : 'Kosong', active: connectedChannels.length > 0 },
    { label: 'Notifikasi Telegram', value: telegramSaved ? 'Terkonfigurasi' : 'Belum', active: telegramSaved },
    { label: 'Kredensial OAuth Google', value: googleConfigured ? 'Terkonfigurasi' : 'Belum', active: googleConfigured },
    { label: 'Gemini API (AI Thumbnail)', value: geminiConfigured ? 'Terkonfigurasi' : 'Belum', active: geminiConfigured },
  ], [connectedChannels.length, redirectUri, telegramSaved, youtubeStatus, googleConfigured, geminiConfigured]);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pengaturan</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola integrasi API dan notifikasi</p>
        </div>
        <Button onClick={loadChannels} disabled={isLoadingChannels} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
          <RefreshCw className={cx('h-4 w-4', isLoadingChannels && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Status Message */}
      {settingsMessage && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 text-sm text-cyan-300">
          {settingsMessage}
        </div>
      )}

      {/* YouTube Integration */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
              <KeyRound className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Integrasi YouTube</h3>
              <p className="text-sm text-slate-400">Kelola channel YouTube yang terhubung</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* OAuth Redirect URI */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                OAuth Redirect URI
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redirectUri}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-slate-700 rounded-2xl bg-slate-800 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <Button
                  onClick={() => { navigator.clipboard.writeText(redirectUri); setSettingsMessage('✅ URI disalin ke clipboard'); }}
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Salin
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tambahkan URI ini ke Google Cloud Console → Credentials → OAuth 2.0 Client IDs
              </p>
            </div>

            {/* Kredensial Google API */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300">
                  Konfigurasi Google Cloud API
                </label>
                <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                  <input type="file" accept=".json" className="hidden" onChange={handleGoogleJsonUpload} />
                  Impor File JSON
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <input
                    type="text"
                    placeholder="Google Client ID"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-800 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Google Client Secret"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-800 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {googleConfigured
                    ? '✅ Kredensial telah tersimpan. Isi ulang hanya jika ingin mengubahnya.'
                    : '⚠ Kredensial belum dikonfigurasi. OAuth YouTube tidak akan berfungsi.'}
                </p>
                <Button
                  onClick={saveGoogleApi}
                  disabled={isSavingGoogle || (!googleClientId.trim() && !googleClientSecret.trim())}
                  className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <Save className="h-4 w-4" />
                  Simpan Kredensial
                </Button>
              </div>
            </div>

            {/* Connected Channels */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300">
                  Channel Terhubung ({connectedChannels.length})
                </label>
                <div className="flex gap-2">
                  {connectedChannels.length > 0 && (
                    <Button onClick={disconnectAllChannels} className="gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                      <Trash2 className="h-3 w-3" />
                      Putuskan Semua
                    </Button>
                  )}
                  <Button onClick={addChannel} className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white">
                    <KeyRound className="h-3 w-3" />
                    Tambah Channel
                  </Button>
                </div>
              </div>

              {connectedChannels.length === 0 ? (
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center">
                  <p className="text-sm text-slate-500 mb-3">Belum ada channel terhubung</p>
                  <Button onClick={addChannel} className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white">
                    <KeyRound className="h-4 w-4" />
                    Hubungkan Channel YouTube
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-4 border border-slate-700 rounded-2xl bg-slate-800/50 hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3">
                        {ch.avatar && ch.avatar.startsWith('http') ? (
                          <img src={ch.avatar} alt={ch.title} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                            {channelInitial(ch)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm text-white">{ch.title}</p>
                          <p className="text-xs text-slate-500">{ch.channel_id}</p>
                        </div>
                        {ch.is_default && (
                          <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full font-medium border border-green-500/20">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!ch.is_default && (
                          <Button onClick={() => setDefaultChannel(ch.id)} className="bg-slate-800 hover:bg-slate-700 text-white">
                            Set Default
                          </Button>
                        )}
                        <Button onClick={() => deleteChannel(ch)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Notifications - Simplified for now */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Notifikasi Telegram</h3>
              <p className="text-sm text-slate-400">Konfigurasi bot Telegram untuk notifikasi</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bot Token</label>
                <input
                  type="password"
                  placeholder={telegramSaved ? "******** (Tersimpan)" : "Contoh: 123456789:ABCdefGHIjklMNO..."}
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-800 text-slate-200 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Chat ID / Group ID</label>
                <input
                  type="text"
                  placeholder="Contoh: 123456789 atau -100123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-800 text-slate-200 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                {telegramSaved
                  ? '✅ Bot Token telah tersimpan. Isi ulang hanya jika ingin mengubahnya.'
                  : '⚠ Bot Token dan Chat ID wajib diisi untuk mengaktifkan notifikasi Telegram.'}
              </p>
              <div className="flex gap-2">
                {telegramSaved && (
                  <Button
                    onClick={deleteTelegram}
                    className="gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                )}
                <Button
                  onClick={testTelegram}
                  disabled={isTesting || (!telegramBotToken && !telegramSaved) || !telegramChatId}
                  className="gap-2 bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <Send className={cx('h-4 w-4', isTesting && 'animate-pulse')} />
                  Test
                </Button>
                <Button
                  onClick={saveTelegram}
                  disabled={isSavingTelegram || !telegramBotToken || !telegramChatId}
                  className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Save className="h-4 w-4" />
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
              <Server className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Status Sistem</h3>
              <p className="text-sm text-slate-400">Status integrasi dan koneksi</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Komponen</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-300">Aktif</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-white">{row.label}</td>
                    <td className="py-3 px-4 text-slate-400">{row.value}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cx(
                        'inline-block w-3 h-3 rounded-full',
                        row.active ? 'bg-green-500' : 'bg-slate-600'
                      )} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Outbound */}
      <WebhookSettings onMessage={setSettingsMessage} />

      {/* API Key Management */}
      <ApiKeySettings onMessage={setSettingsMessage} />

      {/* Backup & Restore */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/20">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Backup & Restore</h3>
              <p className="text-sm text-slate-400">Ekspor dan impor konfigurasi aplikasi</p>
            </div>
          </div>

          {/* Stats */}
          {backupStatus && (
            <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Campaign', value: backupStatus.counts.campaigns },
                { label: 'Playlist', value: backupStatus.counts.playlists },
                { label: 'Settings', value: backupStatus.counts.settings },
                { label: 'Database', value: `${backupStatus.dbSizeMb} MB` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-slate-800/50 border border-slate-700 p-3 text-center">
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={exportBackup}
              disabled={isExporting}
              className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Export Backup'}
            </Button>
            <label className={cx(
              'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer',
              isImporting
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            )}>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importBackup}
                disabled={isImporting}
              />
              <Upload className="h-4 w-4" />
              {isImporting ? 'Mengimpor...' : 'Import Backup'}
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Backup mengekspor campaign, playlist, dan settings (kecuali token sensitif). Impor akan melakukan UPSERT berdasarkan nama.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
