import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-white)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600 }}>
          CrownCut
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user?.role !== 'admin' && (
            <Link to="/" style={{ opacity: 0.9 }}>Barbers</Link>
          )}
          {user ? (
            <>
              {user.role !== 'admin' && (
                <Link to="/my-bookings">My Bookings</Link>
              )}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin">Admin</Link>
                  <Link to="/admin/live-queue">Live Queue</Link>
                  <Link to="/admin/earnings">Earnings</Link>
                </>
              )}
              <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>{user.name}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  color: 'var(--color-white)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link
                to="/register"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-ink)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
