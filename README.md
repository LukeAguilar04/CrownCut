# CrownCut - Barbershop Queue & Appointment System

MVP demo application for a barbershop with walk-in queue, appointments, service selection, and mock payments.

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (new terminal)
cd frontend
npm install
```

### 2. Initialize Database

```bash
cd backend
npm run init-db
npm run seed
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Open in Browser

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001

---

## Test Accounts

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@crowncut.com  | admin123   |
| Customer| customer@test.com   | customer123|
| Customer| maria@test.com      | maria123   |

---

## Database Schema (SQLite)

```
users          - id, email, password_hash, name, role (customer|admin)
barbers        - id, name, photo_url, years_experience, status (available|busy|on_break|off_duty)
services       - id, name, duration_minutes, price_php, description
wallets        - id, user_id, balance_php (mock GCash)
bookings       - id, user_id, barber_id, service_id, booking_type (walk_in|appointment), queue_number, appointment_datetime, status, total_price
queue_state    - id, barber_id, current_serving, last_queue_number
payments       - id, booking_id, amount_php, method (pay_now|pay_at_shop|gcash), status
reviews        - id, user_id, barber_id, booking_id, rating, comment
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register (email, password, name) |
| POST | /api/auth/login | Login (email, password) |
| GET | /api/auth/me | Get current user (requires token) |

### Barbers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/barbers | List all barbers |
| GET | /api/barbers/:id | Get barber details |
| GET | /api/barbers/:id/queue | Get barber queue |
| GET | /api/barbers/:id/slots | Get available time slots |
| PATCH | /api/barbers/:id/status | Update status (admin) |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/services | List all services |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bookings/walk-in | Join walk-in queue (token) |
| POST | /api/bookings/appointment | Book appointment (token) |
| GET | /api/bookings/my | My bookings (token) |
| POST | /api/bookings/:id/pay | Pay for booking (token) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Dashboard data (admin) |
| POST | /api/admin/queue/:barberId/next | Call next customer (admin) |
| PATCH | /api/admin/bookings/:id/complete | Mark booking completed (admin) |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallet | Get mock GCash balance (token) |

---

## Services (Seed Data)

| Service     | Duration | Price |
|-------------|----------|-------|
| Haircut     | 30 min   | ₱200  |
| Beard Trim  | 15 min   | ₱150  |
| Hair Wash   | 10 min   | ₱100  |
| Hair Coloring | 60 min | ₱500  |

---

## Features

- **Authentication:** Register, login, JWT, protected routes
- **Barber Listing:** Photo placeholder, name, experience, status badges (🟢 Available, 🔴 Busy, 🟡 On Break, ⚫ Off Duty)
- **Barber Details:** Queue count, current serving, Join Queue, Book Appointment
- **Walk-In Queue:** Queue number, people ahead, save to SQLite
- **Appointments:** Time slots, priority over walk-ins
- **Service Selection:** Duration, price, auto-calculated total
- **Payment Mock:** Pay Now, Pay at Shop, GCash (mock balance)
- **Admin Dashboard:** Queue list, call next, status updates, completed services, daily earnings

---

## Notes

- No real-time updates; refresh page to see changes
- Mock payments only; no real payment integration
- Default GCash balance: ₱1000 (new users)
- Status updates visible after page refresh
"# CrownCut" 
