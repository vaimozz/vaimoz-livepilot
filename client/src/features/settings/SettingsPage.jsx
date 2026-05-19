import { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Save, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { cx } from '@/lib/cn.js';
import { facebookIntegrationChecklist } from '@/data/integrations.js';
import { api } from '@/lib/api.js';

function channelInitial(channel) {
  return channel.avatar || channel.title?.split(/\s+/).slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'YT';
}

export function SettingsPage() {
  const [redirectUri] = useState(() => `${window.location.origin}/api/youtube/callback`);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [connectedChannels, setConnectedChannels] = useState([]);
  const [settingsMessage, setSettingsMessage] = useState('Pengaturan membaca channel asli dari backend.');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [apiJsonFileName, setApiJsonFileName] = useState('');
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookPageToken, setFacebookPageToken] = useState('');
  const [facebookStatus, setFacebookStatus] = useState('Belum dikonfigurasi');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const result = await api.youtube.channels();
      setConnectedChannels(result.channels || []);
      setSettingsMessage(`${result.channels?.length || 0} channel YouTube asli terbaca dari backend.`);
    } catch (error) {
      setSettingsMessage(`Gagal membaca channel YouTube: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const addChannel = async () => {
    try {
      const result = await api.youtube.authUrl();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setSettingsMessage('Backend tidak mengembalikan URL OAuth YouTube. Cek Client ID dan Client Secret di .env.');
    } catch (error) {
      setSettingsMessage(`Gagal membuat URL OAuth YouTube: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const setDefaultChannel = async (id) => {
    try {
      await api.youtube.setDefaultChannel(id);
      await loadChannels();
      setSettingsMessage('Channel default berhasil diperbarui.');
    } catch (error) {
      setSettingsMessage(`Gagal mengubah default channel: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const deleteChannel = async (channel) => {
    try {
      await api.youtube.removeChannel(channel.id);
      await loadChannels();
      setSettingsMessage(`${channel.title || 'Channel'} berhasil dihapus dari Connected Channels.`);
    } catch (error) {
      setSettingsMessage(`Gagal menghapus channel: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const disconnectAllChannels = async () => {
    try {
      await Promise.all(connectedChannels.map((channel) => api.youtube.removeChannel(channel.id)));
      await loadChannels();
      setSettingsMessage('Semua channel YouTube berhasil diputuskan dari database lokal.');
    } catch (error) {
      setSettingsMessage(`Gagal memutuskan channel: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const saveFacebookIntegration = () => {
    if (!facebookAppId.trim() || !facebookAppSecret.trim() || !facebookPageId.trim() || !facebookPageToken.trim()) {
      setFacebookStatus('Belum lengkap');
      setSettingsMessage('Lengkapi Meta App ID, App Secret, Page ID, dan Page Access Token terlebih dahulu.');
      return;
    }
    setFacebookStatus('Tersimpan lokal');
    setSettingsMessage('Konfigurasi Facebook disimpan di form lokal. Endpoint backend Facebook bisa ditambahkan pada tahap berikutnya.');
  };

  const youtubeStatus = connectedChannels.length > 0 ? 'Terhubung' : 'Belum terhubung';
  const statusRows = useMemo(() => [
    { label: 'YouTube API v3', value: youtubeStatus, active: connectedChannels.length > 0 },
    { label: 'OAuth Redirect URI', value: redirectUri ? 'Tersedia' : 'Belum tersedia', active: Boolean(redirectUri) },
    { label: 'Penyimpanan Token', value: connectedChannels.length > 0 ? 'Ada token/channel' : 'Kosong', active: connectedChannels.length > 0 },
    { label: 'Google API Key / BYOK', value: apiJsonFileName ? 'JSON dipilih' : 'Belum dipilih', active: Boolean(apiJsonFileName) },
    { label: 'Notifikasi Telegram', value: telegramChatId.trim() ? 'Chat ID diisi' : 'Belum diisi', active: Boolean(telegramChatId.trim()) },
  ], [apiJsonFileName, connectedChannels.length, redirectUri, telegramChatId, youtubeStatus]);

  return (
    <>
      <header className="mb-8">
        <SectionTitle eyebrow="Pengaturan" title="YouTube Integration" description="Kelola OAuth YouTube API v3, kredensial Google Cloud, dan channel YouTube yang tersambung." />
      </header>

      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="grid gap-0 xl:grid-cols-2">
          <div className="border-b border-slate-800 p-7 xl:border-b-0 xl:border-r">
            <h3 className="mb-8 text-2xl font-bold text-white">YouTube Integration</h3>
            <div className="space-y-7">
              <label className="block">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100"><span>↗</span><span>Authorized Redirect URI</span></div>
                <p className="mb-3 text-sm text-slate-500">Salin URL ini ke Google Cloud OAuth 2.0 credentials.</p>
                <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-base text-slate-100">{redirectUri}</span>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(redirectUri).then(() => setSettingsMessage('Authorized Redirect URI disalin.')).catch(() => setSettingsMessage('Gagal menyalin. Salin manual dari kolom ini.'))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300">⧉</button>
                </div>
              </label>

              <label className="block">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100"><KeyRound className="h-4 w-4" /><span>Client ID</span></div>
                <input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-base font-semibold text-white outline-none focus:border-blue-500" placeholder="Masukkan Google Client ID" />
              </label>

              <label className="block">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100"><span>▣</span><span>Client Secret</span></div>
                <input value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-base font-semibold text-white outline-none focus:border-blue-500" placeholder="Masukkan Google Client Secret" />
                <p className="mt-3 text-sm text-slate-500">Untuk production, simpan di file .env agar backend bisa memakai OAuth asli.</p>
              </label>

              <Button className="rounded-xl bg-blue-600 px-6 py-6 text-lg text-white hover:bg-blue-500" onClick={() => setSettingsMessage('Catatan: simpan Client ID/Secret di .env backend, lalu restart server.')}><Save className="mr-2 h-5 w-5" /> Save API Credentials</Button>
            </div>
          </div>

          <div className="p-7">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-2xl font-bold text-white">Connected Channels</h3>
                <p className="mt-2 text-base text-slate-400">Channel asli dari OAuth YouTube.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800" onClick={loadChannels} disabled={isLoadingChannels}><RefreshCw className={cx('mr-2 h-4 w-4', isLoadingChannels && 'animate-spin')} /> Refresh</Button>
                <Button className="rounded-xl bg-red-600 px-6 text-base font-bold text-white hover:bg-red-500" onClick={addChannel}>+ Add Channel</Button>
              </div>
            </div>

            <div className="space-y-4">
              {connectedChannels.length > 0 ? connectedChannels.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-500 text-xs font-bold text-slate-950 ring-1 ring-white/10">{channelInitial(channel)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="truncate text-xl font-bold text-white">{channel.title}</p>{channel.isDefault ? <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-300">Default</span> : null}</div>
                      <p className="mt-1 text-sm text-slate-400">ID: {channel.youtubeChannelId || 'Belum tersedia'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!channel.isDefault ? <button type="button" onClick={() => setDefaultChannel(channel.id)} className="rounded-xl bg-slate-800 px-3 py-3 text-slate-200 hover:bg-slate-700">☆</button> : null}
                    <button type="button" onClick={addChannel} className="rounded-xl bg-slate-800 px-3 py-3 text-slate-200 hover:bg-slate-700">⟳</button>
                    <button type="button" onClick={() => deleteChannel(channel)} className="rounded-xl bg-red-500/10 px-3 py-3 text-red-300 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )) : (
                <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-center">
                  <div><p className="font-bold text-white">Belum ada channel terhubung.</p><p className="mt-1 text-sm text-slate-500">Klik Add Channel untuk menyambungkan OAuth YouTube asli.</p></div>
                </div>
              )}
            </div>

            <Button variant="outline" className="mt-7 rounded-xl border-slate-700 bg-slate-800 px-5 py-5 text-white hover:bg-slate-700" onClick={disconnectAllChannels} disabled={!connectedChannels.length}><Trash2 className="mr-2 h-4 w-4" /> Disconnect All Channels</Button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">{settingsMessage}</section>

      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
        <div className="border-b border-slate-800 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-lg font-bold text-blue-300">f</span><h3 className="text-2xl font-bold text-white">Facebook Live API</h3><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">Fitur Tambahan</span></div><p className="text-sm text-slate-400">Facebook didukung sebagai add-on. Masukkan kredensial milik Anda sendiri.</p></div>
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
            <div className="mt-5 flex flex-wrap gap-3"><Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-500" onClick={saveFacebookIntegration}>Simpan Facebook Config</Button><Button variant="outline" className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800" onClick={() => { if (!facebookPageToken.trim()) return setSettingsMessage('Page Access Token wajib diisi sebelum test RTMP Facebook.'); setFacebookStatus('RTMP Test Siap'); setSettingsMessage('RTMP Facebook siap dites dengan token yang Anda isi.'); }}>Test RTMP Facebook</Button></div>
          </div>
          <div className="p-6"><h4 className="mb-4 text-lg font-bold text-white">Checklist Integrasi Facebook</h4><div className="space-y-3">{facebookIntegrationChecklist.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 text-sm"><span className="font-semibold text-slate-200">{item.label}</span><span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{item.status}</span></div>)}</div></div>
        </div>
      </section>

      <section className="mb-6 grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><h3 className="text-lg font-bold text-white">Google API Key / BYOK</h3><p className="mt-1 text-sm text-slate-400">Upload client_secret.json milik Anda.</p><input type="file" accept=".json" onChange={(e) => { setApiJsonFileName(e.target.files?.[0]?.name || ''); setSettingsMessage('File Google API Key / BYOK dipilih. Penyimpanan permanen backend bisa ditambahkan tahap berikutnya.'); }} className="mt-4 text-sm text-slate-300" /></CardContent></Card>
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><h3 className="text-lg font-bold text-white">Notifikasi Telegram</h3><p className="mt-1 text-sm text-slate-400">Masukkan Chat ID Telegram milik Anda.</p><input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Masukkan Chat ID Telegram" /></CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><div className="mb-5 flex items-center gap-2"><Server className="h-5 w-5 text-cyan-300" /><h3 className="text-lg font-bold text-white">Status Sistem</h3></div><div className="space-y-3 text-sm text-slate-400">{statusRows.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4"><span className="font-semibold text-slate-200">{item.label}</span><span className={cx('shrink-0', item.active ? 'text-emerald-300' : 'text-amber-300')}>{item.value}</span></div>)}</div></CardContent></Card>
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h3 className="text-lg font-bold text-white">Catatan Integrasi</h3></div><div className="space-y-3 text-sm text-slate-400"><div className="rounded-2xl bg-slate-950 p-4">Aplikasi tidak lagi menampilkan channel palsu. Channel muncul setelah OAuth YouTube berhasil.</div><div className="rounded-2xl bg-slate-950 p-4">Simpan kredensial Google asli di .env backend untuk mode produksi.</div><div className="rounded-2xl bg-slate-950 p-4">Gunakan tombol Add Channel untuk menyambungkan channel baru lewat OAuth.</div></div></CardContent></Card>
      </section>
    </>
  );
}
