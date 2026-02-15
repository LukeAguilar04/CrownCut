/**
 * CrownCut API Server
 * Barbershop queue and appointment system
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbModule = require('./db');
const { authenticate, requireAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Use db.prepare after init
const db = { prepare: (sql) => dbModule.prepare(sql) };

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run(email.toLowerCase(), hash, name, 'customer');
    const userId = result.lastInsertRowid;
    db.prepare('INSERT INTO wallets (user_id, balance_php) VALUES (?, 1000)').run(userId);
    const token = jwt.sign({ id: userId, email, role: 'customer' }, JWT_SECRET);
    res.status(201).json({ token, user: { id: userId, email, name, role: 'customer' } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user (protected)
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ============ BARBER ROUTES ============

app.get('/api/barbers', (req, res) => {
  try {
    const barbers = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bookings WHERE barber_id = b.id AND status IN ('pending', 'waiting', 'serving')) as queue_count
      FROM barbers b
      ORDER BY b.name
    `).all();
    res.json(barbers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barbers/:id', (req, res) => {
  try {
    const barber = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bookings WHERE barber_id = b.id AND status IN ('pending', 'waiting', 'serving')) as queue_count
      FROM barbers b
      WHERE b.id = ?
    `).get(req.params.id);
    if (!barber) return res.status(404).json({ error: 'Barber not found' });
    res.json(barber);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update barber status (admin)
app.patch('/api/barbers/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['available', 'busy', 'on_break', 'off_duty'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE barbers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SERVICE ROUTES ============

app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY price_php').all();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ BOOKING ROUTES ============

// Join walk-in queue (protected)
app.post('/api/bookings/walk-in', authenticate, (req, res) => {
  try {
    const { barberId, serviceIds, paymentMethod } = req.body;
    if (!barberId) return res.status(400).json({ error: 'Barber ID required' });
    if (!paymentMethod) return res.status(400).json({ error: 'Payment method required' });

    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(barberId);
    if (!barber) return res.status(404).json({ error: 'Barber not found' });
    if (barber.status === 'off_duty') return res.status(400).json({ error: 'Barber is off duty' });

    const services = serviceIds?.length ? db.prepare('SELECT * FROM services WHERE id IN (' + (serviceIds.map(() => '?').join(',')) + ')').all(...serviceIds) : [];
    const totalPrice = services.reduce((sum, s) => sum + s.price_php, 0) || 200;
    const totalMinutes = services.reduce((sum, s) => sum + s.duration_minutes, 0) || 30;
    const serviceId = services[0]?.id || 1;

    // Initialize queue_state if it doesn't exist
    let queueState = db.prepare('SELECT * FROM queue_state WHERE barber_id = ?').get(barberId);
    if (!queueState) {
      db.prepare('INSERT INTO queue_state (barber_id, last_queue_number) VALUES (?, 0)').run(barberId);
      queueState = db.prepare('SELECT * FROM queue_state WHERE barber_id = ?').get(barberId);
    }

    // Get last queue number from database: MAX(queue_number) for this barber, default 0 if null
    const maxRow = db.prepare(`
      SELECT COALESCE(MAX(queue_number), 0) as last_queue 
      FROM bookings 
      WHERE barber_id = ?
    `).get(barberId);
    const lastQueueNumber = (maxRow && (maxRow.last_queue != null)) ? maxRow.last_queue : 0;
    const nextQueueNum = lastQueueNumber + 1;

    // Update queue_state so next request gets correct next number
    db.prepare('UPDATE queue_state SET last_queue_number = ? WHERE barber_id = ?').run(nextQueueNum, barberId);

    // Count people ahead (only active walk-ins with lower queue numbers)
    const peopleAhead = db.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE barber_id = ? AND status IN ('pending', 'waiting', 'serving') AND booking_type = 'walk_in' AND queue_number < ?
    `).get(barberId, nextQueueNum)?.count || 0;

    const result = db.prepare(`
      INSERT INTO bookings (user_id, barber_id, service_id, booking_type, queue_number, status, total_price, payment_method)
      VALUES (?, ?, ?, 'walk_in', ?, 'waiting', ?, ?)
    `).run(req.user.id, barberId, serviceId, nextQueueNum, totalPrice, paymentMethod);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      booking,
      queueNumber: nextQueueNum,
      peopleAhead,
      message: `Your Queue Number: #${nextQueueNum}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book appointment (protected)
app.post('/api/bookings/appointment', authenticate, (req, res) => {
  try {
    const { barberId, serviceIds, datetime, paymentMethod } = req.body;
    if (!barberId || !datetime) return res.status(400).json({ error: 'Barber ID and datetime required' });
    if (!paymentMethod) return res.status(400).json({ error: 'Payment method required' });

    // Check if this time slot is already booked for this barber
    const existingBooking = db.prepare(`
      SELECT * FROM bookings 
      WHERE barber_id = ? AND appointment_datetime = ? AND status NOT IN ('cancelled', 'completed')
    `).get(barberId, datetime);
    
    if (existingBooking) {
      return res.status(400).json({ error: 'This time slot is already booked. Please select another time.' });
    }

    const services = serviceIds?.length ? db.prepare('SELECT * FROM services WHERE id IN (' + (serviceIds.map(() => '?').join(',')) + ')').all(...serviceIds) : [];
    const totalPrice = services.reduce((sum, s) => sum + s.price_php, 0) || 200;
    const serviceId = services[0]?.id || 1;

    // Initialize queue_state if it doesn't exist
    let queueState = db.prepare('SELECT * FROM queue_state WHERE barber_id = ?').get(barberId);
    if (!queueState) {
      db.prepare('INSERT INTO queue_state (barber_id, last_queue_number) VALUES (?, 0)').run(barberId);
      queueState = db.prepare('SELECT * FROM queue_state WHERE barber_id = ?').get(barberId);
    }

    // Get last queue number from database: MAX(queue_number) for this barber, default 0 if null
    const maxRow = db.prepare(`
      SELECT COALESCE(MAX(queue_number), 0) as last_queue 
      FROM bookings 
      WHERE barber_id = ?
    `).get(barberId);
    const lastQueueNumber = (maxRow && (maxRow.last_queue != null)) ? maxRow.last_queue : 0;
    const nextQueueNum = lastQueueNumber + 1;

    // Update queue_state so next request gets correct next number
    db.prepare('UPDATE queue_state SET last_queue_number = ? WHERE barber_id = ?').run(nextQueueNum, barberId);

    const result = db.prepare(`
      INSERT INTO bookings (user_id, barber_id, service_id, booking_type, appointment_datetime, status, total_price, payment_method, queue_number)
      VALUES (?, ?, ?, 'appointment', ?, 'pending', ?, ?, ?)
    `).run(req.user.id, barberId, serviceId, datetime, totalPrice, paymentMethod, nextQueueNum);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      booking,
      queueNumber: nextQueueNum,
      message: 'Appointment booked. Appointments are served before walk-ins.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's bookings (protected)
app.get('/api/bookings/my', authenticate, (req, res) => {
  try {
    // Get payment method from bookings table directly (it's stored there now)
    const bookings = db.prepare(`
      SELECT b.*, bar.name as barber_name, s.name as service_name
      FROM bookings b
      JOIN barbers bar ON bar.id = b.barber_id
      LEFT JOIN services s ON s.id = b.service_id
      WHERE b.user_id = ?
      ORDER BY 
        CASE WHEN b.status IN ('pending', 'waiting', 'serving') THEN 0 ELSE 1 END,
        b.created_at DESC
    `).all(req.user.id);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get barber queue (for barber details)
app.get('/api/barbers/:id/queue', (req, res) => {
  try {
    const queue = db.prepare(`
      SELECT b.*, u.name as customer_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.barber_id = ? AND b.status IN ('pending', 'waiting', 'serving') AND b.booking_type = 'walk_in'
      ORDER BY b.queue_number ASC
    `).all(req.params.id);
    res.json({ queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available time slots for appointments
app.get('/api/barbers/:id/slots', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const barberId = req.params.id;
    
    // Generate all possible slots
    const allSlots = [];
    for (let h = 9; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 17 && m > 0) break;
        allSlots.push(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      }
    }
    
    // Get booked slots for this barber on this date
    const bookedSlots = db.prepare(`
      SELECT appointment_datetime FROM bookings
      WHERE barber_id = ? AND date(appointment_datetime) = date(?) AND status NOT IN ('cancelled', 'completed')
    `).all(barberId, date).map(b => b.appointment_datetime);
    
    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    
    res.json(availableSlots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking (protected) - PATCH and PUT both supported
function updateBookingHandler(req, res) {
  try {
    const bookingId = parseInt(req.params.id);
    const { serviceIds, status, appointment_datetime, paymentMethod } = req.body;
    
    if (!bookingId) return res.status(400).json({ error: 'Invalid booking ID' });
    
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Not your booking' });
    
    let updates = [];
    let params = [];
    
    // If updating services, calculate new total price
    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      const services = db.prepare('SELECT * FROM services WHERE id IN (' + (serviceIds.map(() => '?').join(',')) + ')').all(...serviceIds);
      const totalPrice = services.reduce((sum, s) => sum + s.price_php, 0) || 200;
      const serviceId = services[0]?.id || booking.service_id;
      
      updates.push('service_id = ?');
      updates.push('total_price = ?');
      params.push(serviceId);
      params.push(totalPrice);
    }
    
    // If updating appointment datetime
    if (appointment_datetime) {
      // Check if new time slot is available
      const existingBooking = db.prepare(`
        SELECT * FROM bookings 
        WHERE barber_id = ? AND appointment_datetime = ? AND id != ? AND status NOT IN ('cancelled', 'completed')
      `).get(booking.barber_id, appointment_datetime, bookingId);
      
      if (existingBooking) {
        return res.status(400).json({ error: 'This time slot is already booked. Please select another time.' });
      }
      
      updates.push('appointment_datetime = ?');
      params.push(appointment_datetime);
    }
    
    // If updating payment method
    if (paymentMethod) {
      updates.push('payment_method = ?');
      params.push(paymentMethod);
    }
    
    // If updating status
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    // Execute update if there are changes
    if (updates.length > 0) {
      params.push(bookingId);
      db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    // Return updated booking with joined data
    const updated = db.prepare(`
      SELECT b.*, bar.name as barber_name, s.name as service_name
      FROM bookings b
      JOIN barbers bar ON bar.id = b.barber_id
      LEFT JOIN services s ON s.id = b.service_id
      WHERE b.id = ?
    `).get(bookingId);
    
    if (!updated) return res.status(404).json({ error: 'Booking not found after update' });
    
    res.status(200).json(updated);
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
}
app.patch('/api/bookings/:id', authenticate, updateBookingHandler);
app.put('/api/bookings/:id', authenticate, updateBookingHandler);

// Delete booking (protected)
app.delete('/api/bookings/:id', authenticate, (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    if (!bookingId) return res.status(400).json({ error: 'Invalid booking ID' });
    
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Not your booking' });
    
    // Delete booking from database
    db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
    
    res.status(200).json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete booking' });
  }
});

// ============ ADMIN ROUTES ============

// Create barber (admin)
app.post('/api/admin/barbers', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, years_experience } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Barber name is required' });
    }
    
    const result = db.prepare(`
      INSERT INTO barbers (name, years_experience, status)
      VALUES (?, ?, 'available')
    `).run(name.trim(), parseInt(years_experience) || 0);
    
    const barberId = result.lastInsertRowid;
    
    if (!barberId || barberId === 0) {
      return res.status(500).json({ error: 'Failed to create barber' });
    }
    
    // Initialize queue_state for new barber
    db.prepare('INSERT INTO queue_state (barber_id, last_queue_number) VALUES (?, 0)').run(barberId);
    
    // Return barber (matching list format: no current_serving)
    const barber = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bookings WHERE barber_id = b.id AND status IN ('pending', 'waiting', 'serving')) as queue_count
      FROM barbers b
      WHERE b.id = ?
    `).get(barberId);
    
    if (!barber) {
      return res.status(500).json({ error: 'Barber created but could not be retrieved' });
    }
    
    res.status(201).json(barber);
  } catch (err) {
    console.error('Create barber error:', err);
    res.status(500).json({ error: err.message || 'Failed to create barber' });
  }
});

// Delete barber (admin)
app.delete('/api/admin/barbers/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const barberId = parseInt(req.params.id);
    
    if (!barberId) return res.status(400).json({ error: 'Invalid barber ID' });
    
    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(barberId);
    if (!barber) return res.status(404).json({ error: 'Barber not found' });
    
    // Delete queue_state first (foreign key constraint)
    db.prepare('DELETE FROM queue_state WHERE barber_id = ?').run(barberId);
    
    // Delete barber - CASCADE will handle related bookings
    db.prepare('DELETE FROM barbers WHERE id = ?').run(barberId);
    
    res.status(200).json({ success: true, message: 'Barber deleted' });
  } catch (err) {
    console.error('Delete barber error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete barber' });
  }
});

// Mark booking completed (admin)
app.patch('/api/admin/bookings/:id/complete', authenticate, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE bookings SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('completed', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard data
app.get('/api/admin/dashboard', authenticate, requireAdmin, (req, res) => {
  try {
    const barbers = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bookings WHERE barber_id = b.id AND status IN ('pending', 'waiting', 'serving')) as queue_count
      FROM barbers b
    `).all();

    const queueList = db.prepare(`
      SELECT bk.*, u.name as customer_name, bar.name as barber_name
      FROM bookings bk
      JOIN users u ON u.id = bk.user_id
      JOIN barbers bar ON bar.id = bk.barber_id
      WHERE bk.status IN ('pending', 'waiting', 'serving')
      ORDER BY CASE WHEN bk.booking_type = 'appointment' THEN 0 ELSE 1 END, 
               COALESCE(bk.queue_number, 999999) ASC
    `).all();

    const completedToday = db.prepare(`
      SELECT SUM(total_price) as total FROM bookings
      WHERE status = 'completed' AND date(completed_at) = date('now')
    `).get();

    const dailyEarnings = completedToday?.total || 0;

    res.json({
      barbers,
      queueList,
      dailyEarnings,
      completedToday: db.prepare(`
        SELECT bk.*, u.name as customer_name, bar.name as barber_name
        FROM bookings bk
        JOIN users u ON u.id = bk.user_id
        JOIN barbers bar ON bar.id = bk.barber_id
        WHERE bk.status = 'completed' AND date(bk.completed_at) = date('now')
        ORDER BY bk.completed_at DESC
      `).all()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PAYMENT ROUTES ============

app.post('/api/bookings/:id/pay', authenticate, (req, res) => {
  try {
    const { method } = req.body; // cash, e-payment, card
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Not your booking' });

    // Map frontend payment methods to database format
    const paymentMethod = method === 'cash' ? 'cash' : method === 'e-payment' ? 'e-payment' : method === 'card' ? 'card' : 'pay_now';

    // Update booking with payment method
    db.prepare('UPDATE bookings SET payment_method = ? WHERE id = ?').run(paymentMethod, booking.id);

    // Record payment
    db.prepare(`
      INSERT INTO payments (booking_id, amount_php, method, status, paid_at)
      VALUES (?, ?, ?, 'paid', CURRENT_TIMESTAMP)
    `).run(booking.id, booking.total_price, paymentMethod);

    res.json({ success: true, message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get wallet balance (protected)
app.get('/api/wallet', authenticate, (req, res) => {
  try {
    let wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (!wallet) {
      db.prepare('INSERT INTO wallets (user_id, balance_php) VALUES (?, 1000)').run(req.user.id);
      wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START SERVER ============
async function start() {
  await dbModule.initDatabase();
  app.listen(PORT, () => {
    console.log(`🪒 CrownCut API running on http://localhost:${PORT}`);
  });
}
start().catch((e) => {
  console.error('Failed to start:', e);
  process.exit(1);
});
