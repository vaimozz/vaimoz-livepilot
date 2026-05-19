import { youtubeCategoryOptions } from '@/data/integrations.js';
import { cx } from '@/lib/cn.js';
import { countYoutubeTags, youtubeDurationModes, youtubeScheduleTypes, youtubeWeekdayOptions } from '@/lib/campaignUtils.js';

export function YoutubeApiForm({ state, setters, youtubeChannels = [], availableYoutubePlaylists, selectedYoutubePlaylist, changeYoutubeChannel }) {
  return (
    <div className="space-y-5">
      {/* Channel, Privasi, Playlist */}
      <div className="grid gap-4 xl:grid-cols-3">
        <label className="block text-xs font-semibold text-slate-400">
          Channel YouTube
          <select value={state.youtubeChannelId} onChange={(e) => changeYoutubeChannel(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
            {youtubeChannels.length > 0
              ? youtubeChannels.map((channel) => <option key={channel.id} value={String(channel.id)}>{channel.name || channel.title}{channel.isDefault ? ' — Default' : ''}</option>)
              : <option value="">Belum ada channel tersambung</option>}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-400">
          Privasi Live
          <select value={state.youtubePrivacy} onChange={(e) => setters.setYoutubePrivacy(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
            <option>Publik</option>
            <option>Tidak Publik</option>
            <option>Privat</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-400">
          Playlist YouTube
          <div className="mt-2 flex gap-2">
            <select value={selectedYoutubePlaylist?.id || ''} onChange={(e) => setters.setYoutubePlaylistId(e.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              {availableYoutubePlaylists.length > 0
                ? availableYoutubePlaylists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)
                : <option value="">Belum ada playlist</option>}
            </select>
            <button type="button" onClick={() => setters.setIsYoutubePlaylistModalOpen(true)} className="shrink-0 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400">+ Baru</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Playlist mengikuti channel terpilih seperti di YouTube Studio.</p>
        </label>
      </div>

      {/* Judul Live / Rotasi */}
      <label className="block text-xs font-semibold text-slate-400">
        Judul Live / Rotasi Judul
        <textarea
          value={state.youtubeLiveTitles}
          onChange={(e) => setters.setYoutubeLiveTitles(e.target.value)}
          className="mt-2 min-h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
          placeholder="Masukkan daftar judul, satu judul per baris. Akan dirotasi acak setiap sesi live."
        />
        <p className="mt-1 text-[11px] text-slate-500">{state.youtubeLiveTitles.split('\n').filter(Boolean).length} judul tersimpan.</p>
      </label>

      {/* Deskripsi */}
      <label className="block text-xs font-semibold text-slate-400">
        Deskripsi Live
        <textarea
          value={state.youtubeDescription}
          onChange={(e) => setters.setYoutubeDescription(e.target.value)}
          className="mt-2 min-h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
          placeholder="Masukkan deskripsi live yang akan dipakai di YouTube"
        />
      </label>

      {/* Tags */}
      <label className="block text-xs font-semibold text-slate-400">
        Tags YouTube
        <textarea value={state.youtubeTags} onChange={(e) => setters.setYoutubeTags(e.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Masukkan tag dipisahkan koma" />
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>Gunakan koma untuk memisahkan tags.</span>
          <span className="rounded-full bg-slate-900 px-2 py-1 text-cyan-300">{countYoutubeTags(state.youtubeTags)} tag</span>
        </div>
      </label>

      {/* Kategori, Replay, Thumbnail Mode */}
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-400">
            Kategori YouTube
            <select value={state.youtubeCategoryId} onChange={(e) => setters.setYoutubeCategoryId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              {youtubeCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <p className="mt-2 text-[11px] text-slate-500">ID API: {state.youtubeCategoryId}</p>
          </label>
          <label className="block text-xs font-semibold text-slate-400">
            Replay setelah selesai
            <select value={state.youtubeReplayPrivacy} onChange={(e) => setters.setYoutubeReplayPrivacy(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              <option>Unlisted</option><option>Private</option><option>Public</option>
            </select>
            <p className="mt-2 text-[11px] text-slate-500">Status video replay setelah live selesai.</p>
          </label>
          <label className="block text-xs font-semibold text-slate-400">
            Mode Thumbnail
            <select value={state.youtubeThumbnailMode} onChange={(e) => setters.setYoutubeThumbnailMode(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              <option>Rotasi otomatis</option><option>Pakai 1 thumbnail</option><option>Tanpa thumbnail</option>
            </select>
            <p className="mt-2 text-[11px] text-slate-500">Pilih mode thumbnail untuk live.</p>
          </label>
        </div>

        {/* Monetisasi & Konten AI */}
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={state.youtubeMonetizationEnabled} onChange={(e) => setters.setYoutubeMonetizationEnabled(e.target.checked)} className="mt-0.5 h-3.5 w-3.5" />
              <div><p className="text-xs font-bold text-white">Monetisasi aktif</p><p className="mt-0.5 text-[10px] text-slate-500">Sesuai default channel YouTube yang dipilih.</p></div>
            </label>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <p className="mb-2 text-xs font-bold text-white">Konten AI?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Ya', 'Tidak'].map((answer) => (
                <label key={answer} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition', state.youtubeAiContentAnswer === answer ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600')}>
                  <input type="radio" name="youtube-ai-content" checked={state.youtubeAiContentAnswer === answer} onChange={() => setters.setYoutubeAiContentAnswer(answer)} className="h-3.5 w-3.5" />
                  {answer}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Disclosure konten AI di YouTube Studio.</p>
          </div>
        </div>

        {/* Jadwal, Durasi, Smart Stop */}
        <div className="grid auto-rows-fr gap-4 xl:grid-cols-3">
          {/* Tipe Jadwal */}
          <div className="flex h-full min-h-[290px] flex-col rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">Tipe Jadwal</p>
            <div className="grid grid-cols-3 gap-2">
              {youtubeScheduleTypes.map((type) => (
                <button key={type} type="button" onClick={() => setters.setYoutubeScheduleType(type)} className={cx('rounded-xl border px-2 py-2.5 text-xs font-bold transition', state.youtubeScheduleType === type ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500')}>{type}</button>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                {state.youtubeScheduleType === 'Sekali Jalan' ? 'Waktu Mulai' : state.youtubeScheduleType === 'Harian' ? 'Waktu Mulai Harian' : 'Jadwal Mingguan'}
              </p>
              {state.youtubeScheduleType === 'Sekali Jalan' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="date" value={state.youtubeStartDate} onChange={(e) => setters.setYoutubeStartDate(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
                  <input type="time" value={state.youtubeStartTime} onChange={(e) => setters.setYoutubeStartTime(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
                </div>
              )}
              {state.youtubeScheduleType === 'Harian' && (
                <input type="time" value={state.youtubeStartTime} onChange={(e) => setters.setYoutubeStartTime(e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              )}
              {state.youtubeScheduleType === 'Mingguan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {youtubeWeekdayOptions.map((day) => (
                      <button key={day} type="button" onClick={() => setters.setYoutubeWeeklyDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day])} className={cx('rounded-xl border px-3 py-2 text-[11px] font-bold transition', state.youtubeWeeklyDays.includes(day) ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-300')}>{day}</button>
                    ))}
                  </div>
                  <input type="time" value={state.youtubeStartTime} onChange={(e) => setters.setYoutubeStartTime(e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
                </div>
              )}
            </div>
            <p className="mt-auto pt-3 text-[11px] text-slate-500">Zona waktu: Asia/Jakarta / WIB.</p>
          </div>

          {/* Mode Durasi */}
          <div className="flex h-full min-h-[290px] flex-col rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Mode Durasi</p>
              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <input type="checkbox" checked={state.youtubeAutoStopEnabled} onChange={(e) => setters.setYoutubeAutoStopEnabled(e.target.checked)} />Auto stop
              </label>
            </div>
            <select value={state.youtubeDurationMode} onChange={(e) => setters.setYoutubeDurationMode(e.target.value)} disabled={!state.youtubeAutoStopEnabled} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
              {youtubeDurationModes.map((mode) => <option key={mode}>{mode}</option>)}
            </select>
            <div className={cx('mt-4', !state.youtubeAutoStopEnabled && 'opacity-40')}>
              {state.youtubeDurationMode === 'Tetap (Sesuai Jam Stop)' && (
                <>
                  <input type="time" value={state.youtubeStopTime} onChange={(e) => setters.setYoutubeStopTime(e.target.value)} disabled={!state.youtubeAutoStopEnabled} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
                  <p className="mt-2 text-right text-[11px] italic text-slate-400">Live berhenti tepat jam ini.</p>
                </>
              )}
              {state.youtubeDurationMode === 'Acak (Random Range)' && (
                <div className="grid gap-3">
                  <input type="time" value={state.youtubeRandomStopMin} onChange={(e) => setters.setYoutubeRandomStopMin(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" />
                  <input type="time" value={state.youtubeRandomStopMax} onChange={(e) => setters.setYoutubeRandomStopMax(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" />
                  <p className="text-[11px] italic text-slate-400">Sistem memilih waktu stop acak.</p>
                </div>
              )}
              {state.youtubeDurationMode === 'Pola (Berulang)' && (
                <div className="grid gap-3">
                  <input type="number" value={state.youtubeRepeatLiveDuration} onChange={(e) => setters.setYoutubeRepeatLiveDuration(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" placeholder="Durasi live (menit)" />
                  <input type="number" value={state.youtubeRepeatBreakDuration} onChange={(e) => setters.setYoutubeRepeatBreakDuration(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" placeholder="Jeda (menit)" />
                  <input type="number" value={state.youtubeRepeatCount} onChange={(e) => setters.setYoutubeRepeatCount(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" placeholder="Pengulangan" />
                </div>
              )}
            </div>
            <p className="mt-auto pt-3 text-[11px] text-slate-500">Mode durasi mengatur cara live berhenti.</p>
          </div>

          {/* Smart Stop */}
          <div className="flex h-full min-h-[290px] flex-col rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><p className="text-sm font-bold text-white">Smart Stop</p><p className="mt-1 text-[11px] text-slate-400">Tunda stop jika penonton ramai.</p></div>
              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <input type="checkbox" checked={state.youtubeSmartStopEnabled} onChange={(e) => setters.setYoutubeSmartStopEnabled(e.target.checked)} />Aktif
              </label>
            </div>
            <div className={cx('grid gap-2', !state.youtubeSmartStopEnabled && 'opacity-40')}>
              <input type="number" min="0" value={state.youtubeSmartStopViewerThreshold} onChange={(e) => setters.setYoutubeSmartStopViewerThreshold(e.target.value)} disabled={!state.youtubeSmartStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white" placeholder="Penonton >" />
              <select value={state.youtubeSmartStopDelayMinutes} onChange={(e) => setters.setYoutubeSmartStopDelayMinutes(e.target.value)} disabled={!state.youtubeSmartStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
                <option value="5">5 menit</option><option value="15">15 menit</option><option value="30">30 menit</option><option value="60">60 menit</option><option value="120">2 jam</option>
              </select>
            </div>
            <p className="mt-auto pt-3 text-[11px] text-slate-400">Smart Stop tetap mengikuti mode durasi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
