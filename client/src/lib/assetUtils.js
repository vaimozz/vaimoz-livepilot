export function normalizeAssetType(type) {
  if (type === 'Thumbnail' || type === 'Image') return 'Images';
  return type || 'Video';
}

export function getBackendAssetType(tab) {
  if (tab === 'Images') return 'Thumbnail';
  return tab;
}

export function assetTabFromType(type) {
  return normalizeAssetType(type);
}

export function normalizeAssetFromApi(asset) {
  const sizeBytes = Number(asset.sizeBytes || 0);
  return {
    ...asset,
    type: normalizeAssetType(asset.type),
    source: asset.source || 'Lokal',
    size: asset.size || formatAssetBytes(sizeBytes),
    sizeMb: sizeBytes ? sizeBytes / 1024 / 1024 : Number(asset.sizeMb || 0),
    resolution: asset.resolution || asset.metadata?.resolution || '',
    duration: asset.duration || asset.metadata?.duration || '',
    bitrate: asset.bitrate || asset.metadata?.bitrate || '',
    isLive: Boolean(asset.isLive),
    createdAt: Date.parse(asset.createdAt || '') || Number(asset.createdAt || 0) || 0,
  };
}

export function formatAssetBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function getAssetCounts(items) {
  return {
    Video: items.filter((item) => item.type === 'Video').length,
    Audio: items.filter((item) => item.type === 'Audio').length,
    Images: items.filter((item) => item.type === 'Images').length,
  };
}

export function filterAssetItems(items, assetTab, searchAsset) {
  return items.filter((item) => {
    const matchesTab = item.type === assetTab;
    const matchesSearch = item.name.toLowerCase().includes(searchAsset.toLowerCase());
    return matchesTab && matchesSearch;
  });
}

export function sortAssetItems(items, sortMode) {
  const sorted = [...items];
  if (sortMode === 'Nama File') return sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sortMode === 'Ukuran File') return sorted.sort((a, b) => Number(b.sizeMb || 0) - Number(a.sizeMb || 0));
  return sorted.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export function renameAssetItems(items, id, newName) {
  const cleanName = newName.trim();
  if (!cleanName) return items;
  return items.map((item) => (item.id === id ? { ...item, name: cleanName } : item));
}

export function buildProductionJob({ name, mode, albums, songsPerAlbum, audioCount, footageCount }) {
  return {
    id: Date.now(),
    name: name.trim(),
    mode,
    albums,
    songsPerAlbum,
    audioCount,
    footageCount,
    status: 'Menunggu',
  };
}
