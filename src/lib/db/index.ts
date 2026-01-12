import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/memory-lane.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

export default db;

export interface Entry {
  id: string;
  dropbox_path: string;
  title: string | null;
  transcript: string | null;
  position: number | null;
  disabled: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
