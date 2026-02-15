import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function BarberList() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/barbers')
      .then(setBarbers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '1rem', borderRadius: '8px' }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Our Barbers</h1>
      <p style={{ color: 'var(--color-off)', marginBottom: '1.5rem' }}>
        Choose a barber and join the queue or book an appointment
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {barbers.map((barber) => (
          <Link
            key={barber.id}
            to={`/barber/${barber.id}`}
            style={{
              background: 'var(--color-white)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(44,44,44,0.12)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
            }}
          >
            <div
              style={{
                height: 160,
                background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #4a4a4a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              ✂️
            </div>
            <div style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{barber.name}</h2>
              <p style={{ color: 'var(--color-off)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                {barber.years_experience} years experience
              </p>
              <StatusBadge status={barber.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
