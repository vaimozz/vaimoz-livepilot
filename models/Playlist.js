// Model helper Playlist.js
// Logic query utama sementara masih dipakai di services/http/*.routes.js.
// File ini disiapkan agar struktur mudah dikembangkan ke pola MVC penuh.
import { db } from '../db/database.js';

export function findAllPlaylists() {
  return db.prepare('SELECT 1 as ok').all();
}
