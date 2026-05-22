import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);

console.log("=== CHECKING CAMPAIGN DB ===");
const row = db.prepare("SELECT * FROM campaigns WHERE name = 'RainTes'").get();
console.log(row);

console.log("\n=== CHECKING EVENTS DB (LAST 5 LOGS) ===");
const events = db.prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT 5").all();
events.forEach(e => console.log(`[${e.created_at}] ${e.level} - ${e.category}: ${e.message}`));

console.log("\n=== CHECKING RECURRING HISTORY ===");
const history = db.prepare("SELECT * FROM recurring_history ORDER BY executed_at DESC LIMIT 5").all();
console.log(history);
