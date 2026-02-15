/**
 * Initialize CrownCut database
 * Creates schema and runs migrations
 */
const { initDatabase, getDb, saveDb } = require('../db');
const fs = require('fs');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, '..', 'crowncut.db');
  const schemaPath = path.join(__dirname, 'schema.sql');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
  console.log('✅ Database initialized successfully at', dbPath);
}

main().catch((e) => {
  console.error('❌ Init failed:', e.message);
  process.exit(1);
});
