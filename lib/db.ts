import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'tasker.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  runMigrations(_db);
  seedDivisions(_db);
  return _db;
}

function seedDivisions(db: Database.Database) {
  const now = new Date().toISOString();

  // Backfill master divisi from existing users.divisi values
  const names = (db.prepare(`SELECT DISTINCT divisi FROM users WHERE divisi IS NOT NULL AND divisi != ''`).all() as { divisi: string }[])
    .map(r => r.divisi);

  const insertDivision = db.prepare('INSERT OR IGNORE INTO divisions (id, name, created_at) VALUES (?, ?, ?)');
  const findDivision = db.prepare('SELECT id FROM divisions WHERE name = ?');

  const tx = db.transaction(() => {
    for (const name of names) {
      if (!findDivision.get(name)) insertDivision.run(uuidv4(), name, now);
    }

    // Ensure each user has a primary division row matching users.divisi
    const users = db.prepare(`SELECT id, divisi FROM users WHERE divisi IS NOT NULL AND divisi != ''`).all() as { id: string; divisi: string }[];
    const link = db.prepare('INSERT OR IGNORE INTO user_divisions (user_id, division_id, is_primary) VALUES (?, ?, ?)');
    const clearPrimary = db.prepare('UPDATE user_divisions SET is_primary = 0 WHERE user_id = ?');
    const setPrimary = db.prepare('UPDATE user_divisions SET is_primary = 1 WHERE user_id = ? AND division_id = ?');
    for (const u of users) {
      const div = findDivision.get(u.divisi) as { id: string } | undefined;
      if (!div) continue;
      link.run(u.id, div.id, 1);
      clearPrimary.run(u.id);
      setPrimary.run(u.id, div.id);
    }
  });
  tx();
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      divisi TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      brief TEXT,
      deadline TEXT,
      assigned_to_id TEXT NOT NULL REFERENCES users(id),
      assigned_by_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'belum_mulai',
      edit_version INTEGER NOT NULL DEFAULT 1,
      project_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by_id, status);

    CREATE TABLE IF NOT EXISTS task_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      type TEXT NOT NULL,
      at TEXT NOT NULL,
      by_user_id TEXT NOT NULL REFERENCES users(id),
      note TEXT,
      link TEXT,
      submission_version INTEGER,
      from_edit_version INTEGER,
      to_edit_version INTEGER,
      changes_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_task ON task_events(task_id, at);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_event_id TEXT NOT NULL REFERENCES task_events(id),
      kind TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      storage_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      note TEXT,
      location TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT,
      all_day INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id, start_at);
    CREATE INDEX IF NOT EXISTS idx_calendar_visibility ON calendar_events(visibility, start_at);

    CREATE TABLE IF NOT EXISTS calendar_event_shares (
      event_id TEXT NOT NULL REFERENCES calendar_events(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (event_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON calendar_event_shares(user_id, event_id);

    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_divisions (
      user_id TEXT NOT NULL REFERENCES users(id),
      division_id TEXT NOT NULL REFERENCES divisions(id),
      is_primary INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, division_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_divisions_division ON user_divisions(division_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function runMigrations(db: Database.Database) {
  // Add role column if not exists (for existing DBs)
  const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map(c => c.name);
  if (!userCols.includes('role')) {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  }
  if (!userCols.includes('password_hash')) {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
  }

  // Add archived_at to tasks
  const taskCols = (db.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[]).map(c => c.name);
  if (!taskCols.includes('archived_at')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN archived_at TEXT`);
  }
  if (!taskCols.includes('project_id')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
}
