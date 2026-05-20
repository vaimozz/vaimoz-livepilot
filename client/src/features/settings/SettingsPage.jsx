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

  // Telegram state
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    notifyStreamStart: true,
    notifyStreamStop: true,
    notifyStreamError: true,
    notifyViewerMilestone: true,
    notifySmartStop: true,
    notifyBroadcastLive: true,
    viewerMilestoneThreshold: 100,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Facebook state
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookPageToken, setFacebookPageToken] = useState('');
  const [facebookStatus, setFacebookStatus] = useState('Belum dikonfigurasi');

  const loadSettings = async () => {
    try {
      const [settingsResult, prefsResult] = await Promise.all([
        api.settings.get(),
        api.settings.getNotifPrefs(),
      ]);
      const s = settingsResult.settings || {};
      setTelegramSaved(s.telegram_bot_token?.set === true);
      if (s.telegram_chat_id && typeof s.telegram_chat_id === 'string') {
        setTelegramChatId(s.telegram_chat_id);
      }
      setNotifPrefs(prefsResult);
    } catch {
      // settings endpoint mungkin belum ada data — tidak masalah
    }
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const result = await api.youtube.channels();
      setConnectedChannels(result.channels || []);
      setSettingsMessage(`${result.channels?.length || 0} channel YouTube terbaca dari backend.`);
    } catch (error) {
      setSettingsMessage(`Gagal membaca channel: ${error instanceof Error ? error.message : 'Error.'}`);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadChannels();
    loadSettings();
  }, []);

  // ── YouTube channel actions ───────────────────────────────────────────────
  const addChannel = async () => {
    try {
      const result = await api.youtube.authUrl();
      if (result.url) { window.location.href = result.url; return; }
      setSettingsMessage('Backend tidak mengembalikan URL OAuth. Cek .env.');
    } catch (error) {
      setSettingsMessage(`Gagal membuat URL OAuth: ${error instanceof Error ? error.message : 'Error.'}`);
    }
  };

  const setDefaultChannel = async (id) => {
    try {
      await api.youtube.setDefaultChannel(id);
      await loadChannels();
      setSettingsMessage('Channel default berhasil diperbarui.');
    } catch (error) {
      setSettingsMessage(`Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    }
  };

  const deleteChannel = async (channel) => {
    try {
      await api.youtube.removeChannel(channel.id);
      await loadChannels();
      setSettingsMessage(`${channel.title || 'Channel'} berhasil dihapus.`);
    } catch (error) {
      setSettingsMessage(`Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    }
  };

  const disconnectAllChannels = async () => {
    try {
      await Promise.all(connectedChannels.map((ch) => api.youtube.removeChannel(ch.id)));
      await loadChannels();
      setSettingsMessage('Semua channel berhasil diputuskan.');
    } catch (error) {
      setSettingsMessage(`Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    }
  };

  // ── Telegram actions ─────────────────────────────────────────────────────
  const saveTelegram = async () => {
    if (!telegramBotToken.trim()) return setSettingsMessage('⚠ Bot Token wajib diisi.');
    if (!telegramChatId.trim()) return setSettingsMessage('⚠ Chat ID wajib diisi.');
    setIsSavingTelegram(true);
    try {
      await api.settings.saveTelegram(telegramBotToken.trim(), telegramChatId.trim());
      setTelegramSaved(true);
      setTelegramBotToken('');
      setSettingsMessage('✅ Telegram credentials berhasil disimpan ke database.');
    } catch (error) {
      setSettingsMessage(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Error.'}`);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const testTelegram = async () => {
    if (!telegramBotToken.trim() && !telegramSaved) return setSettingsMessage('⚠ Isi Bot Token terlebih dahulu.');
    if (!telegramChatId.trim()) return setSettingsMessage('⚠ Isi Chat ID terlebih dahulu.');
    setIsTesting(true);
    setSettingsMessage('Mengirim pesan test ke Telegram...');
    try {
      const result = await api.settings.testTelegram(
        telegramBotToken.trim() || undefined,
        telegramChatId.trim()
      );
      setSettingsMessage(result.message || '✅ Pesan test berhasil dikirim!');
    } catch (error) {
      setSettingsMessage(`❌ Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const deleteTelegram = async () => {
    try {
      await api.settings.deleteTelegram();
      setTelegramSaved(false);
      setTelegramBotToken('');
      setTelegramChatId('');
      setSettingsMessage('Telegram credentials dihapus dari database.');
    } catch (error) {
      setSettingsMessage(`Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    }
  };

  const saveNotifPrefs = async () => {
    setIsSavingPrefs(true);
    try {
      await api.settings.saveNotifPrefs(notifPrefs);
      setSettingsMessage('✅ Preferensi notifikasi berhasil disimpan.');
    } catch (error) {
      setSettingsMessage(`Gagal: ${error instanceof Error ? error.message : 'Error.'}`);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const saveFacebookIntegration = () => {
    if (!facebookAppId.trim() || !facebookAppSecret.trim() || !facebookPageId.trim() || !facebookPageToken.trim()) {
      setFacebookStatus('Belum lengkap');
      setSettingsMessage('Lengkapi semua field Facebook terlebih dahulu.');
      return;
    }
    setFacebookStatus('Tersimpan lokal');
    setSettingsMessage('Konfigurasi Facebook disimpan di form lokal.');
  };

  const youtubeStatus = connectedChannels.length > 0 ? 'Terhubung' : 'Belum terhubung';
  const statusRows = useMemo(() => [
    { label: 'YouTube API v3', value: youtubeStatus, active: connectedChannels.length > 0 },
    { label: 'OAuth Redirect URI', value: redirectUri ? 'Tersedia' : 'Belum', active: Boolean(redirectUri) },
    { label: 'Token Tersimpan', value: connectedChannels.length > 0 ? 'Ada' : 'Kosong', active: connectedChannels.length > 0 },
    { label: 'Notifikasi Telegram', value: telegramSaved ? 'Terkonfigurasi' : 'Belum', active: telegramSaved },
    { label: 'Google API Key', value: apiJsonFileName ? 'JSON dipilih' : 'Belum', active: Boolean(apiJsonFileName) },
  ], [apiJsonFileName, connectedChannels.length, redirectUri, telegramSaved, youtubeStatus]);

  return (
    <>
      <header className="mb-8">
        <SectionTitle eyebrow="Pengaturan" title="Integrasi & Notifikasi" description="Kelola OAuth YouTube, Telegram notifications, dan konfigurasi backend." />
      </header>

      {/* ── YouTube Integration ─────────────────────────────────────────── */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="grid gap-0 xl:grid-cols-2">
          <div className="border-b border-slate-800 p-7 xl:border-b-0 xl:border-r">
            <h3 className="mb-6 text-2xl font-bold text-white">YouTube Integration</h3>
            <div className="space-y-5">
              <label className="block">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100"><span>↗</span><span>Authorized Redirect URI</span></div>
                <p className="mb-2 text-xs text-slate-500">Salin ke Google Cloud OAuth 2.0 credentials.</p>
                <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{redirectUri}</span>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(redirectUri).then(() => setSettingsMessage('URI disalin.')).catch(() => {})} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300">⧉</button>
                </div>
              </label>
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                <p className="mb-1 font-semibold text-slate-200">Cara setup OAuth:</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs">
                  <li>Buka Google Cloud Console → APIs &amp; Services → Credentials</li>
                  <li>Buat OAuth 2.0 Client ID (Web application)</li>
                  <li>Tambahkan Redirect URI di atas</li>
                  <li>Simpan Client ID &amp; Secret ke file <code className="text-cyan-300">.env</code></li>
                  <li>Restart server, lalu klik Add Channel</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="p-7">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Connected Channels</h3>
                <p className="mt-1 text-sm text-slate-400">Channel dari OAuth YouTube.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800" onClick={loadChannels} disabled={isLoadingChannels}><RefreshCw className={cx('mr-2 h-4 w-4', isLoadingChannels && 'animate-spin')} />Refresh</Button>
                <Button className="rounded-xl bg-red-600 px-5 font-bold text-white hover:bg-red-500" onClick={addChannel}>+ Add Channel</Button>
              </div>
            </div>
            <div className="space-y-3">
              {connectedChannels.length > 0 ? connectedChannels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-500 text-xs font-bold text-slate-950">{channelInitial(ch)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-white">{ch.title}</p>{ch.isDefault && <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-300">Default</span>}</div>
                      <p className="mt-0.5 text-xs text-slate-400">ID: {ch.youtubeChannelId || '—'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!ch.isDefault && <button type="button" onClick={() => setDefaultChannel(ch.id)} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700" title="Set default">☆</button>}
                    <button type="button" onClick={addChannel} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700" title="Re-auth">⟳</button>
                    <button type="button" onClick={() => deleteChannel(ch)} className="rounded-xl bg-red-500/10 px-3 py-2 text-red-300 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )) : (
                <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-center">
                  <div><p className="font-bold text-white">Belum ada channel.</p><p className="mt-1 text-xs text-slate-500">Klik Add Channel untuk OAuth YouTube.</p></div>
                </div>
              )}
            </div>
            {connectedChannels.length > 0 && (
              <Button variant="outline" className="mt-5 rounded-xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={disconnectAllChannels}><Trash2 className="mr-2 h-4 w-4" />Disconnect All</Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Status message ──────────────────────────────────────────────── */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">{settingsMessage}</section>

      {/* ── Telegram Notifications ──────────────────────────────────────── */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <Send className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Notifikasi Telegram</h3>
                <p className="text-sm text-slate-400">Kirim notifikasi otomatis ke Telegram bot Anda.</p>
              </div>
            </div>
            <span className={cx('rounded-full px-3 py-1 text-xs font-bold', telegramSaved ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>
              {telegramSaved ? '✓ Terkonfigurasi' : 'Belum dikonfigurasi'}
            </span>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-2">
          {/* Credentials */}
          <div className="border-b border-slate-800 p-6 xl:border-b-0 xl:border-r">
            <h4 className="mb-4 font-bold text-white">Credentials</h4>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">Bot Token</span>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={telegramSaved ? '••••••••••••• (sudah tersimpan)' : 'Masukkan Bot Token dari @BotFather'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">Chat ID</span>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Contoh: -1001234567890 atau 123456789"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button onClick={saveTelegram} disabled={isSavingTelegram} className="rounded-xl bg-blue-600 text-white hover:bg-blue-500">
                  <Save className="mr-2 h-4 w-4" />{isSavingTelegram ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button onClick={testTelegram} disabled={isTesting} variant="outline" className="rounded-xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                  <Send className="mr-2 h-4 w-4" />{isTesting ? 'Mengirim...' : 'Test Kirim'}
                </Button>
                {telegramSaved && (
                  <Button onClick={deleteTelegram} variant="outline" className="rounded-xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20">
                    <Trash2 className="mr-2 h-4 w-4" />Hapus
                  </Button>
                )}
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-400">
                <p className="mb-1 font-semibold text-slate-300">Cara mendapatkan credentials:</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Chat <code className="text-cyan-300">@BotFather</code> di Telegram → <code className="text-cyan-300">/newbot</code></li>
                  <li>Copy Bot Token yang diberikan</li>
                  <li>Tambahkan bot ke grup/channel Anda</li>
                  <li>Chat <code className="text-cyan-300">@userinfobot</code> untuk mendapatkan Chat ID</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-bold text-white">Preferensi Notifikasi</h4>
              <Button onClick={saveNotifPrefs} disabled={isSavingPrefs} className="rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-500">
                <Bell className="mr-2 h-4 w-4" />{isSavingPrefs ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'notifyStreamStart',      label: '🔴 Stream dimulai' },
                { key: 'notifyStreamStop',       label: '⏹ Stream dihentikan' },
                { key: 'notifyStreamError',      label: '❌ Error stream' },
                { key: 'notifyBroadcastLive',    label: '📡 Broadcast YouTube live' },
                { key: 'notifyViewerMilestone',  label: '🎉 Milestone penonton' },
                { key: 'notifySmartStop',        label: '⏸ Smart Stop ditunda' },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                  <span className="text-sm text-slate-200">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifPrefs[key] ?? true}
                    onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-blue-500"
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">Milestone threshold (viewers)</span>
                <input
                  type="number"
                  min="10"
                  value={notifPrefs.viewerMilestoneThreshold}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, viewerMilestoneThreshold: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ── Facebook Live API ───────────────────────────────────────────── */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
        <div className="border-b border-slate-800 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-lg font-bold text-blue-300">f</span><h3 className="text-xl font-bold text-white">Facebook Live API</h3><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">Fitur Tambahan</span></div><p className="text-sm text-slate-400">Facebook didukung sebagai add-on.</p></div>
            <span className={cx('rounded-full px-4 py-2 text-sm font-bold', facebookStatus === 'Tersimpan lokal' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>{facebookStatus}</span>
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-2">
          <div className="border-b border-slate-800 p-6 xl:border-b-0 xl:border-r">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={facebookAppId} onChange={(e) => setFacebookAppId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Meta App ID" />
              <input value={facebookAppSecret} onChange={(e) => setFacebookAppSecret(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Meta App Secret" />
              <input value={facebookPageId} onChange={(e) => setFacebookPageId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Facebook Page ID" />
              <input value={facebookPageToken} onChange={(e) => setFacebookPageToken(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Page Access Token" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-500" onClick={saveFacebookIntegration}>Simpan Facebook Config</Button>
            </div>
          </div>
          <div className="p-6"><h4 className="mb-4 text-lg font-bold text-white">Checklist Integrasi Facebook</h4><div className="space-y-3">{facebookIntegrationChecklist.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 text-sm"><span className="font-semibold text-slate-200">{item.label}</span><span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{item.status}</span></div>)}</div></div>
        </div>
      </section>

      {/* ── Google API Key + Status ─────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-5">
            <h3 className="text-lg font-bold text-white">Google API Key / BYOK</h3>
            <p className="mt-1 text-sm text-slate-400">Upload client_secret.json milik Anda.</p>
            <input type="file" accept=".json" onChange={(e) => { setApiJsonFileName(e.target.files?.[0]?.name || ''); setSettingsMessage('File dipilih. Penyimpanan permanen bisa ditambahkan tahap berikutnya.'); }} className="mt-4 text-sm text-slate-300" />
            {apiJsonFileName && <p className="mt-2 text-xs text-emerald-400">✓ {apiJsonFileName}</p>}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2"><Server className="h-5 w-5 text-cyan-300" /><h3 className="text-lg font-bold text-white">Status Sistem</h3></div>
            <div className="space-y-2 text-sm">
              {statusRows.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-3">
                  <span className="font-semibold text-slate-200">{item.label}</span>
                  <span className={cx('shrink-0 text-xs font-bold', item.active ? 'text-emerald-300' : 'text-amber-300')}>{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
