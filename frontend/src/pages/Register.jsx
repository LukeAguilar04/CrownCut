import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-cream)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--color-white)',
          padding: '2rem',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          width: '100%',
          maxWidth: 400,
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>CrownCut</h1>
        <p style={{ color: 'var(--color-off)', marginBottom: '1.5rem' }}>Create your account</p>
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '1rem',
            }}
          />
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '1rem',
            }}
          />
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '1rem',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'var(--color-charcoal)',
              color: 'var(--color-white)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--color-gold)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
