import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);

console.log("\n=== CHECKING LOGS DB (LAST 5 SCHEDULER LOGS) ===");
const logs = db.prepare("SELECT * FROM logs WHERE source = 'Scheduler' ORDER BY created_at DESC LIMIT 5").all();
logs.forEach(e => console.log(`[${e.created_at}] ${e.level} - ${e.source}: ${e.message}`));

console.log("\n=== CHECKING RECURRING HISTORY ===");
const history = db.prepare("SELECT * FROM recurring_history ORDER BY executed_at DESC LIMIT 5").all();
console.log(history);
