/**
 * Seed CrownCut database with sample data
 */
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'crowncut.db');

function run(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

function get(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

  try {
    run(db, 'DELETE FROM reviews');
    run(db, 'DELETE FROM payments');
    run(db, 'DELETE FROM bookings');
    run(db, 'DELETE FROM queue_state');
    run(db, 'DELETE FROM wallets');
    run(db, 'DELETE FROM barbers');
    run(db, 'DELETE FROM services');
    run(db, 'DELETE FROM users');

    run(db, 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['admin@crowncut.com', hashPassword('admin123'), 'Admin User', 'admin']);
    run(db, 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['customer@test.com', hashPassword('customer123'), 'Juan Dela Cruz', 'customer']);
    run(db, 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['maria@test.com', hashPassword('maria123'), 'Maria Santos', 'customer']);

    run(db, 'INSERT INTO barbers (name, photo_url, years_experience, status) VALUES (?, ?, ?, ?)',
      ['Mike Reyes', '/barbers/mike.jpg', 8, 'available']);
    run(db, 'INSERT INTO barbers (name, photo_url, years_experience, status) VALUES (?, ?, ?, ?)',
      ['Carlos Santos', '/barbers/carlos.jpg', 5, 'busy']);
    run(db, 'INSERT INTO barbers (name, photo_url, years_experience, status) VALUES (?, ?, ?, ?)',
      ['Rico Fernandez', '/barbers/rico.jpg', 12, 'available']);

    run(db, 'INSERT INTO services (name, duration_minutes, price_php, description) VALUES (?, ?, ?, ?)',
      ['Haircut', 30, 200, 'Classic haircut']);
    run(db, 'INSERT INTO services (name, duration_minutes, price_php, description) VALUES (?, ?, ?, ?)',
      ['Beard Trim', 15, 150, 'Beard shaping and trimming']);
    run(db, 'INSERT INTO services (name, duration_minutes, price_php, description) VALUES (?, ?, ?, ?)',
      ['Hair Wash', 10, 100, 'Shampoo and conditioning']);
    run(db, 'INSERT INTO services (name, duration_minutes, price_php, description) VALUES (?, ?, ?, ?)',
      ['Hair Coloring', 60, 500, 'Full hair coloring service']);

    run(db, 'INSERT INTO queue_state (barber_id, current_serving, last_queue_number) VALUES (?, 0, 0)', [1]);
    run(db, 'INSERT INTO queue_state (barber_id, current_serving, last_queue_number) VALUES (?, 0, 0)', [2]);
    run(db, 'INSERT INTO queue_state (barber_id, current_serving, last_queue_number) VALUES (?, 0, 0)', [3]);

    run(db, 'INSERT INTO wallets (user_id, balance_php) VALUES (?, ?)', [2, 1500]);
    run(db, 'INSERT INTO wallets (user_id, balance_php) VALUES (?, ?)', [3, 800]);

    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();

    console.log('✅ Seed data inserted successfully');
    console.log('\n📋 Test Accounts:');
    console.log('  Admin:    admin@crowncut.com / admin123');
    console.log('  Customer: customer@test.com / customer123');
    console.log('  Customer: maria@test.com / maria123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    db.close();
    process.exit(1);
  }
}

main();
