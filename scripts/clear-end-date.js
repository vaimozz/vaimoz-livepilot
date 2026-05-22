import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);

db.prepare("UPDATE campaigns SET recurring_end_date = NULL, status = 'Draft' WHERE status = 'Completed' OR recurring_end_date IS NOT NULL").run();
console.log("✅ Berhasil menghapus batas tanggal berhenti dari semua kampanye.");
console.log("✅ Status 'Completed' telah dikembalikan menjadi 'Draft'. Silakan simpan ulang di Dasbor.");
