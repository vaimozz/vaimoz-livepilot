import { useEffect, useRef, useState, useCallback } from 'react';
import { Cloud, FileVideo, Image as ImageIcon, Loader2, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cx } from '@/lib/cn.js';
import {
  assetTabFromType,
  filterAssetItems,
  getAssetCounts,
  normalizeAssetFromApi,
  sortAssetItems,
} from '@/lib/assetUtils.js';
import { api } from '@/lib/api.js';
import { AssetMediaCard } from './AssetMediaCard.jsx';
import { GDriveModal } from './GDriveModal.jsx';

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
}

export function AssetLibraryPage() {
  const fileInputRef = useRef(null);
  const [mainTab, setMainTab] = useState('File Media');
  const [assetTab, setAssetTab] = useState('Video');
  const [searchAsset, setSearchAsset] = useState('');
  const [sortMode, setSortMode] = useState('Terbaru Ditambahkan');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetName, setEditingAssetName] = useState('');
  const [statusMessage, setStatusMessage] = useState('Siap mengelola aset media dari SQLite.');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0 }); // progress upload lokal
  const [showGdriveModal, setShowGdriveModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [playlists, setPlaylists] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [productionJobs, setProductionJobs] = useState([]);
  
  // States untuk form Produksi Album
  const [prodName, setProdName] = useState('');
  const [prodDuration, setProdDuration] = useState(60);
  const [prodResolution, setProdResolution] = useState('1080p Full HD');
  const [prodShuffle, setProdShuffle] = useState(false);

  const selectedVideos = mediaFiles.filter((item) => selectedIds.includes(item.id) && (item.type === 'Video' || item.type === 'Images'));
  const selectedAudios = mediaFiles.filter((item) => selectedIds.includes(item.id) && item.type === 'Audio');

  const loadPlaylists = async () => {
    try {
      const result = await api.playlists.list();
      setPlaylists(result.playlists || []);
    } catch (e) {
      console.error('Gagal memuat playlist', e);
    }
  };

  useEffect(() => {
    if (mainTab === 'Koleksi / Playlist') {
      loadPlaylists();
    }
  }, [mainTab]);

  const loadProductionJobs = async () => {
    try {
      const res = await api.production.jobs();
      setProductionJobs(res.jobs || []);
    } catch (e) {
      console.error('Gagal memuat job produksi', e);
    }
  };

  useEffect(() => {
    let interval;
    if (mainTab === 'Produksi Album') {
      loadProductionJobs();
      interval = setInterval(loadProductionJobs, 3000);
    }
    return () => clearInterval(interval);
  }, [mainTab]);

  const loadAssets = async (nextMessage = '') => {
    setIsLoadingAssets(true);
    try {
      const result = await api.assets.list();
      const normalized = (result.assets || []).map(normalizeAssetFromApi);
      setMediaFiles(normalized);
      setSelectedIds([]);
      if (nextMessage) setStatusMessage(nextMessage);
      else setStatusMessage(`Daftar aset dimuat dari SQLite. Total ${normalized.length} aset.`);
    } catch (error) {
      setStatusMessage(`Gagal memuat aset: ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const counts = getAssetCounts(mediaFiles);
  const filteredMedia = sortAssetItems(filterAssetItems(mediaFiles, assetTab, searchAsset), sortMode);
  const assetTabs = [
    { label: 'Video', count: counts.Video, icon: FileVideo },
    { label: 'Audio', count: counts.Audio, icon: null },
    { label: 'Images', count: counts.Images, icon: ImageIcon },
  ];

  const openDevicePicker = () => {
    fileInputRef.current?.click();
  };

  const uploadFromDevice = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (event.target && 'value' in event.target) event.target.value = '';
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: 0 });
    setStatusMessage(`Mengupload ${files.length} file ke server...`);
    try {
      const result = await api.assets.uploadWithProgress(files, (loaded, total) => {
        setUploadProgress({ loaded, total });
        const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setStatusMessage(`Mengupload... ${pct}%`);
      });
      const count = (result.assets || []).length;
      const firstType = result.assets?.[0]?.type;
      // Reload penuh dari backend agar URL file dijamin benar
      await loadAssets(`${count} file berhasil diupload dan tersimpan di SQLite.`);
      if (firstType) setAssetTab(assetTabFromType(firstType));
    } catch (error) {
      setStatusMessage(`Upload gagal: ${getErrorMessage(error)}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0 });
    }
  }, []);

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragging(false); }
  }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((f) => /^(video|audio|image)\//.test(f.type));
    if (droppedFiles.length === 0) return;
    uploadFromDevice({ target: { files: droppedFiles } });
  }, [uploadFromDevice]);

  const toggleSelect = (id) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((itemId) => itemId !== id) : [...ids, id]));

  const startEditAsset = (asset) => {
    setEditingAssetId(asset.id);
    setEditingAssetName(asset.name);
    setStatusMessage(`Mengedit nama file ${asset.name}.`);
  };

  const cancelEditAsset = () => {
    setEditingAssetId(null);
    setEditingAssetName('');
    setStatusMessage('Edit nama file dibatalkan.');
  };

  const saveEditAsset = async () => {
    const cleanName = editingAssetName.trim();
    if (!cleanName) return setStatusMessage('Nama file tidak boleh kosong.');

    const oldAsset = mediaFiles.find((item) => item.id === editingAssetId);
    setStatusMessage(`Menyimpan perubahan nama ${oldAsset?.name || 'aset'} ke SQLite...`);
    try {
      const result = await api.assets.rename(editingAssetId, cleanName);
      const asset = normalizeAssetFromApi(result.asset);
      setMediaFiles((items) => items.map((item) => (item.id === asset.id ? asset : item)));
      setStatusMessage(`${oldAsset?.name || 'Aset'} berhasil diubah menjadi ${asset.name}.`);
      setEditingAssetId(null);
      setEditingAssetName('');
    } catch (error) {
      setStatusMessage(`Rename gagal: ${getErrorMessage(error)}`);
    }
  };

  const deleteAsset = async (id) => {
    const asset = mediaFiles.find((item) => item.id === id);
    const ok = window.confirm(`Hapus ${asset?.name || 'aset'} dari database dan storage lokal?`);
    if (!ok) return;

    setStatusMessage(`Menghapus ${asset?.name || 'aset'}...`);
    try {
      await api.assets.remove(id);
      setMediaFiles((items) => items.filter((item) => item.id !== id));
      setSelectedIds((ids) => ids.filter((itemId) => itemId !== id));
      if (editingAssetId === id) cancelEditAsset();
      setStatusMessage(`${asset?.name || 'Aset'} dihapus dari SQLite.`);
    } catch (error) {
      setStatusMessage(`Hapus gagal: ${getErrorMessage(error)}`);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return setStatusMessage('Pilih aset terlebih dahulu sebelum menghapus.');
    const ok = window.confirm(`Hapus ${selectedIds.length} aset terpilih?`);
    if (!ok) return;

    setStatusMessage(`Menghapus ${selectedIds.length} aset terpilih...`);
    try {
      await Promise.all(selectedIds.map((id) => api.assets.remove(id)));
      setMediaFiles((items) => items.filter((item) => !selectedIds.includes(item.id)));
      setStatusMessage(`${selectedIds.length} aset terpilih berhasil dihapus dari SQLite.`);
      setSelectedIds([]);
    } catch (error) {
      setStatusMessage(`Hapus terpilih gagal: ${getErrorMessage(error)}`);
      loadAssets();
    }
  };

  const createPlaylist = async () => {
    const cleanName = playlistName.trim();
    if (!cleanName) return setStatusMessage('Nama playlist wajib diisi.');
    const itemIds = selectedIds.length > 0 ? selectedIds : [];
    setStatusMessage('Membuat playlist...');
    try {
      await api.playlists.create({
        name: cleanName,
        itemIds,
        type: 'Video',
        privacy: 'Private',
      });
      setPlaylistName('');
      setSelectedIds([]);
      setStatusMessage(`Playlist "${cleanName}" berhasil dibuat dan disimpan.`);
      loadPlaylists();
    } catch (e) {
      setStatusMessage(`Gagal membuat playlist: ${getErrorMessage(e)}`);
    }
  };

  const deletePlaylist = async (id, name) => {
    if (!window.confirm(`Hapus playlist "${name}"?`)) return;
    try {
      await api.playlists.remove(id);
      setStatusMessage(`Playlist "${name}" dihapus.`);
      loadPlaylists();
    } catch (e) {
      setStatusMessage(`Gagal menghapus: ${getErrorMessage(e)}`);
    }
  };

  const createProductionJob = async () => {
    if (!prodName.trim()) return setStatusMessage('Nama album wajib diisi.');
    if (selectedVideos.length === 0) return setStatusMessage('Pilih minimal 1 background (Video/Gambar) dari File Media terlebih dahulu.');
    
    setStatusMessage('Memulai produksi album...');
    try {
      await api.production.start({
        name: prodName.trim(),
        backgrounds: selectedVideos.map(v => v.id),
        audios: selectedAudios.map(a => a.id),
        shuffleAudio: prodShuffle,
        duration: prodDuration,
        resolution: prodResolution
      });
      setStatusMessage('Job produksi berhasil masuk antrian.');
      setProdName('');
      loadProductionJobs();
    } catch (e) {
      setStatusMessage(`Gagal memulai produksi: ${getErrorMessage(e)}`);
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm('Hapus job ini?')) return;
    try {
      await api.production.remove(id);
      loadProductionJobs();
    } catch (e) {
      setStatusMessage(`Gagal menghapus job: ${getErrorMessage(e)}`);
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-4rem)] rounded-3xl border bg-slate-950/70 p-5 shadow-xl shadow-black/10 transition-colors duration-200 ${isDragging ? 'border-blue-500/60 bg-blue-950/20' : 'border-slate-800'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-950/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-blue-400 bg-slate-900/90 px-16 py-12 shadow-2xl">
            <Upload className="h-14 w-14 text-blue-400" />
            <p className="text-xl font-bold text-blue-300">Lepaskan file untuk mengupload</p>
            <p className="text-sm text-slate-400">Video, Audio, dan Gambar didukung</p>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*,.mp4,.mkv,.webm,.mp3,.wav,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={uploadFromDevice}
      />

      <div className="mb-5 flex flex-col justify-between gap-4 border-b border-slate-700 pb-5 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <FileVideo className="h-7 w-7 text-emerald-400" />
          <h2 className="text-2xl font-bold text-white">Manajer Aset</h2>
        </div>
        <div className="flex w-full rounded-xl border border-slate-600 bg-slate-800 p-1 text-sm font-semibold text-slate-200 xl:w-auto">
          {['File Media', 'Koleksi / Playlist', 'Produksi Album'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMainTab(item)}
              className={cx('rounded-lg px-5 py-2 transition', mainTab === item ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-slate-700 hover:text-white')}
            >
              {item === 'Produksi Album' ? '♫ Produksi Album' : item}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar + upload progress */}
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <p className="text-sm text-slate-300">{statusMessage}</p>
        {isUploading && uploadProgress.total > 0 && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-right text-[11px] text-cyan-400 font-semibold">
              {Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%
            </p>
          </div>
        )}
      </div>

      {mainTab === 'File Media' ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-6 border-b border-slate-800 pb-4">
            {assetTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = assetTab === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setAssetTab(tab.label)}
                  className={cx('flex items-center gap-2 text-sm font-semibold transition', isActive ? 'text-emerald-400' : 'text-slate-300 hover:text-white')}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : <span className="text-base">♫</span>}
                  <span>{tab.label}</span>
                  <span className={cx('rounded-full px-2 py-1 text-[11px]', isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300')}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 xl:flex-row xl:items-center">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 md:w-72">
                <Search className="h-5 w-5 text-slate-300" />
                <input
                  value={searchAsset}
                  onChange={(event) => setSearchAsset(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                  placeholder="Cari..."
                />
              </div>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="h-11 rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-white outline-none">
                <option>Terbaru Ditambahkan</option>
                <option>Nama File</option>
                <option>Ukuran File</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button className="h-10 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500" onClick={() => setShowGdriveModal(true)}>
                <Cloud className="mr-2 h-4 w-4" /> GDRIVE
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800" onClick={openDevicePicker} disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Perangkat
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => loadAssets()} disabled={isLoadingAssets}>
                <RefreshCw className={cx('mr-2 h-4 w-4', isLoadingAssets && 'animate-spin')} /> Refresh
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/20" onClick={deleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" /> Hapus {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
              <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-300">
                <button type="button" onClick={() => setViewMode('grid')} className={cx('px-3 py-2', viewMode === 'grid' ? 'text-blue-400' : 'hover:bg-slate-800')}>▦</button>
                <button type="button" onClick={() => setViewMode('list')} className={cx('px-3 py-2', viewMode === 'list' ? 'text-blue-400' : 'hover:bg-slate-800')}>☰</button>
              </div>
            </div>
          </div>

          {isLoadingAssets ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat aset dari SQLite...
            </div>
          ) : filteredMedia.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-3'}>
              {filteredMedia.map((item) => (
                <AssetMediaCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.includes(item.id)}
                  onToggleSelect={toggleSelect}
                  onDelete={deleteAsset}
                  viewMode={viewMode}
                  isEditing={editingAssetId === item.id}
                  editName={editingAssetName}
                  onStartEdit={startEditAsset}
                  onEditNameChange={setEditingAssetName}
                  onSaveRename={saveEditAsset}
                  onCancelRename={cancelEditAsset}
                />
              ))}
            </div>
          ) : (
            <div
              className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-950/20 text-sm text-slate-500 transition hover:border-blue-500/40 hover:bg-blue-950/10"
              onClick={openDevicePicker}
            >
              <Upload className="h-10 w-10 text-slate-600" />
              <p className="font-semibold text-slate-400">Drag &amp; drop file atau klik untuk memilih</p>
              <p className="text-xs">Mendukung video, audio, dan gambar</p>
            </div>
          )}
        </>
      ) : mainTab === 'Koleksi / Playlist' ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              className="h-11 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-white outline-none placeholder:text-slate-400"
              placeholder="Nama playlist baru"
            />
            <Button className="bg-cyan-600 text-white hover:bg-cyan-500 shrink-0" onClick={createPlaylist}>
              + Buat Playlist
            </Button>
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-slate-400">
              <span className="text-cyan-400 font-semibold">{selectedIds.length} aset</span> terpilih akan dimasukkan ke playlist baru.
            </p>
          )}
          {playlists.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-600">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{playlist.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {playlist.items ?? (playlist.itemIds?.length ?? 0)} item
                        {playlist.privacy ? ` · ${playlist.privacy}` : ''}
                        {playlist.updatedAt ? ` · ${new Date(playlist.updatedAt).toLocaleDateString('id-ID')}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePlaylist(playlist.id, playlist.name)}
                      className="shrink-0 text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      title="Hapus playlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/20 text-center">
              <div>
                <p className="text-sm font-semibold text-white">Belum ada koleksi / playlist.</p>
                <p className="mt-1 text-xs text-slate-400">Pilih beberapa media dari tab "File Media" lalu buat playlist baru.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <h3 className="text-xl font-bold text-white">Produksi Album</h3>
            <p className="mt-2 text-sm text-slate-300 mb-6">Pilih file media dari tab "File Media" terlebih dahulu untuk menjadikannya background dan audio.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Nama Album</label>
                <input value={prodName} onChange={(e) => setProdName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-white outline-none" placeholder="Contoh: Album Lo-Fi Relax" />
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-sm font-semibold text-slate-200">Media Terpilih</p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className={selectedVideos.length > 0 ? "text-emerald-400" : "text-slate-500"}>{selectedVideos.length} Background</span>
                  <span className={selectedAudios.length > 0 ? "text-blue-400" : "text-slate-500"}>{selectedAudios.length} Audio</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Durasi (Menit)</label>
                  <input type="number" min="1" value={prodDuration} onChange={(e) => setProdDuration(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Resolusi</label>
                  <select value={prodResolution} onChange={(e) => setProdResolution(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-white outline-none">
                    <option>1080p Full HD</option>
                    <option>720p HD</option>
                    <option>1440p 2K</option>
                    <option>Original</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input type="checkbox" checked={prodShuffle} onChange={(e) => setProdShuffle(e.target.checked)} className="h-5 w-5 rounded border-slate-600 bg-slate-800 accent-purple-500" />
                <span className="text-sm font-semibold text-slate-300">Acak Urutan Audio</span>
              </label>

              <Button className="mt-6 h-12 w-full rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50" onClick={createProductionJob} disabled={selectedVideos.length === 0 || !prodName.trim()}>⊙ Mulai Produksi Album</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 flex flex-col h-full max-h-[600px] overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 shrink-0">Antrian Job</h3>
            <div className="overflow-y-auto space-y-3 pr-2 flex-1 custom-scrollbar">
              {productionJobs.length ? (
                productionJobs.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white">{job.name}</p>
                        <p className="mt-1 text-xs text-slate-400">Status: <span className={
                          job.status === 'Selesai' ? 'text-emerald-400' :
                          job.status === 'Gagal' ? 'text-red-400' :
                          job.status === 'Memproses' ? 'text-yellow-400' : 'text-slate-300'
                        }>{job.status}</span></p>
                      </div>
                      {(job.status !== 'Memproses') && (
                        <button onClick={() => deleteJob(job.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {job.status === 'Memproses' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${job.progress}%` }} />
                        </div>
                      </div>
                    )}
                    
                    {job.error_message && (
                      <p className="mt-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">{job.error_message}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="mt-12 text-center text-sm text-slate-400">Belum ada antrian job.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showGdriveModal && (
        <GDriveModal
          onClose={() => {
            setShowGdriveModal(false);
          }}
          onAssetAdded={(asset) => {
            setShowGdriveModal(false);
            // Reload penuh dari backend agar aset GDrive langsung muncul
            loadAssets(`${asset.name} berhasil diunduh dari Google Drive.`);
            setMainTab('File Media');
            setAssetTab(assetTabFromType(asset.type));
          }}
        />
      )}
    </div>
  );
}
