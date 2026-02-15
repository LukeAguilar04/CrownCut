/**
 * Database connection - sql.js (pure JS SQLite, no native compilation)
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'crowncut.db');
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

let db = null;

function getDb() {
  if (db) return db;
  throw new Error('Database not initialized. Run init-db first.');
}

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e) {
      console.warn('Could not save db:', e.message);
    }
  }
}

function prepare(sql) {
  return {
    run(...params) {
      const database = getDb();
      const stmt = database.prepare(sql);
      stmt.bind(params);
      stmt.step();
      const lastId = database.exec('SELECT last_insert_rowid() as id');
      const lastInsertRowid = lastId.length && lastId[0].values && lastId[0].values[0] ? lastId[0].values[0][0] : null;
      stmt.free();
      saveDb();
      return { lastInsertRowid: lastInsertRowid || 0, changes: 1 };
    },
    get(...params) {
      const database = getDb();
      const stmt = database.prepare(sql);
      stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    all(...params) {
      const database = getDb();
      const stmt = database.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  };
}

async function initDatabase() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    saveDb();
  }
  // Migration: add payment_method to bookings if missing (existing DBs created before column was added)
  try {
    const info = db.exec('PRAGMA table_info(bookings)');
    const columns = info[0] && info[0].values ? info[0].values.map((row) => row[1]) : [];
    if (!columns.includes('payment_method')) {
      db.exec('ALTER TABLE bookings ADD COLUMN payment_method TEXT');
      saveDb();
    }
  } catch (e) {
    console.warn('Migration check failed:', e.message);
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  prepare,
  exec(sql) {
    getDb().exec(sql);
    saveDb();
  },
  saveDb
};
