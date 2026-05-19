export function getStatusClass(status) {
  if (status === 'Sedang Live') return 'bg-emerald-400/10 text-emerald-300';
  if (status === 'Siap') return 'bg-cyan-400/10 text-cyan-300';
  if (status === 'Dijeda') return 'bg-slate-700 text-slate-300';
  if (status === 'Menunggu') return 'bg-amber-400/10 text-amber-300';
  if (status === 'Draft') return 'bg-slate-800 text-slate-300';
  return 'bg-slate-800 text-slate-300';
}

export function getPlatformBadgeClass(platform) {
  if (platform === 'YouTube') return 'border-red-400/20 bg-red-500/10 text-red-300';
  return 'border-blue-400/20 bg-blue-500/10 text-blue-300';
}

export function getLogLevelClass(level) {
  if (level === 'INFO') return 'bg-cyan-400/10 text-cyan-300';
  if (level === 'FFMPEG') return 'bg-emerald-400/10 text-emerald-300';
  if (level === 'API') return 'bg-blue-400/10 text-blue-300';
  if (level === 'SERVER') return 'bg-violet-400/10 text-violet-300';
  if (level === 'RTMP') return 'bg-indigo-400/10 text-cyan-300';
  if (level === 'SYSTEM') return 'bg-slate-500/20 text-slate-200';
  if (level === 'WARN') return 'bg-amber-400/10 text-amber-300';
  if (level === 'ERROR') return 'bg-red-400/10 text-red-300';
  return 'bg-slate-800 text-slate-300';
}
