import { useEffect, useMemo, useState } from 'react';
import { Bell, KeyRound, RefreshCw, Save, Send, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { cx } from '@/lib/cn.js';
import { facebookIntegrationChecklist } from '@/data/integrations.js';
import { api } from '@/lib/api.js';

function channelInitial(ch) {
  return ch.avatar || ch.title?.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'YT';
}

export function SettingsPage() {
  const [redirectUri] = useState(() => `${window.location.origin}/api/youtube/callback`);
  const [connectedChannels, setConnectedChannels] = useState([]);
  const [settingsMessage, setSettingsMessage] = useState('Memuat pengaturan...');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [apiJsonFileName, setApiJsonFileName] = useState('');

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

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

  const loadSettings = async () => {
    try {
      const [sr, pr] = await Promise.all([api.settings.get(), api.settings.getNotifPrefs()]);
      const s = sr.settings || {};
      setTelegramSaved(s.telegram_bot_token?.set === true);
      if (typeof s.telegram_chat_id === 'string') setTelegramChatId(s.telegram_chat_id);
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

  useEffect(() => { loadChannels(); loadSettings(); }, []);

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

  const youtubeStatus = connectedChannels.length > 0 ? 'Terhubung' : 'Belum terhubung';
  const statusRows = useMemo(() => [
    { label: 'YouTube API v3',      value: youtubeStatus,                                    active: connectedChannels.length > 0 },
    { label: 'OAuth Redirect URI',  value: redirectUri ? 'Tersedia' : 'Belum',               active: Boolean(redirectUri) },
    { label: 'Token Tersimpan',     value: connectedChannels.length > 0 ? 'Ada' : 'Kosong',  active: connectedChannels.length > 0 },
    { label: 'Notifikasi Telegram', value: telegramSaved ? 'Terkonfigurasi' : 'Belum',       active: telegramSaved },
    { label: 'Google API Key',      value: apiJsonFileName ? 'JSON dipilih' : 'Belum',       active: Boolean(apiJsonFileName) },
  ], [apiJsonFileName, connectedChannels.length, redirectUri, telegramSaved, youtubeStatus]);

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

            {/* Connected Channels */}
            <div>
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
                        {ch.avatar ? (
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

      {/* Telegram Notifications */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle icon={Bell} title="Notifikasi Telegram" />
          
          <div className="space-y-4 mt-4">
            {/* Credentials Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Token {telegramSaved && <span className="text-green-600">(Tersimpan)</span>}
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={telegramSaved ? '••••••••••••••••' : 'Masukkan Bot Token'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dapatkan dari @BotFather di Telegram
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Masukkan Chat ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dapatkan dari @userinfobot
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={saveTelegram} disabled={isSavingTelegram} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingTelegram ? 'Menyimpan...' : 'Simpan Credentials'}
              </Button>
              <Button onClick={testTelegram} disabled={isTesting} variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                {isTesting ? 'Mengirim...' : 'Test Notifikasi'}
              </Button>
              {telegramSaved && (
                <Button onClick={deleteTelegram} variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Preferensi Notifikasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyStreamStart}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifyStreamStart: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Stream Dimulai</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyStreamStop}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifyStreamStop: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Stream Berhenti</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyStreamError}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifyStreamError: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Error Stream</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyBroadcastLive}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifyBroadcastLive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Broadcast Live</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyViewerMilestone}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifyViewerMilestone: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Milestone Viewer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifySmartStop}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, notifySmartStop: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Smart Stop</span>
                </label>
              </div>

              {/* Viewer Milestone Threshold */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threshold Milestone Viewer
                </label>
                <input
                  type="number"
                  value={notifPrefs.viewerMilestoneThreshold}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, viewerMilestoneThreshold: parseInt(e.target.value) || 100 })}
                  min="10"
                  step="10"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notifikasi dikirim setiap kelipatan angka ini
                </p>
              </div>

              <Button onClick={saveNotifPrefs} disabled={isSavingPrefs} className="mt-4 gap-2">
                <Save className="h-4 w-4" />
                {isSavingPrefs ? 'Menyimpan...' : 'Simpan Preferensi'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facebook Live API */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle icon={ShieldCheck} title="Facebook Live API" />
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App ID</label>
                <input
                  type="text"
                  value={facebookAppId}
                  onChange={(e) => setFacebookAppId(e.target.value)}
                  placeholder="Masukkan Facebook App ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App Secret</label>
                <input
                  type="password"
                  value={facebookAppSecret}
                  onChange={(e) => setFacebookAppSecret(e.target.value)}
                  placeholder="Masukkan App Secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page ID</label>
                <input
                  type="text"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                  placeholder="Masukkan Page ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Access Token</label>
                <input
                  type="password"
                  value={facebookPageToken}
                  onChange={(e) => setFacebookPageToken(e.target.value)}
                  placeholder="Masukkan Page Token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button onClick={saveFacebook} className="gap-2">
              <Save className="h-4 w-4" />
              Simpan Konfigurasi Facebook
            </Button>

            {/* Integration Checklist */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Checklist Integrasi</h3>
              <div className="space-y-2">
                {facebookIntegrationChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-gray-400">{idx + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              Status: {facebookStatus}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google API Key Upload */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle icon={KeyRound} title="Google API Key (JSON)" />
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Service Account JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setApiJsonFileName(file.name);
                    setSettingsMessage(`File ${file.name} dipilih (belum diupload ke server)`);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                File JSON dari Google Cloud Console → Service Accounts
              </p>
            </div>
            {apiJsonFileName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✅ File terpilih: {apiJsonFileName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle icon={Server} title="Status Sistem" />
          
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Komponen</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {statusRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{row.label}</td>
                      <td className="py-2 px-3 text-gray-600">{row.value}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={cx(
                          'inline-block w-3 h-3 rounded-full',
                          row.active ? 'bg-green-500' : 'bg-gray-300'
                        )} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
