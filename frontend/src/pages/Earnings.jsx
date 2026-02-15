import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Earnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((dashboardData) => {
        setData({
          dailyEarnings: dashboardData.dailyEarnings || 0,
          completedToday: dashboardData.completedToday || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Earnings</h1>
      <p style={{ color: 'var(--color-off)', marginBottom: '1.5rem' }}>
        Daily earnings and completed queue
      </p>

      {/* Daily Earnings */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-gold) 0%, #A68521 100%)',
          color: 'var(--color-ink)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Daily Earnings (Completed Today)</p>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>₱{data?.dailyEarnings || 0}</p>
      </div>

      {/* Completed Today */}
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Completed Queue</h2>
        {!data?.completedToday?.length ? (
          <p style={{ color: 'var(--color-off)' }}>No completed services today</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.completedToday.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{c.customer_name}</span>
                  <span style={{ color: 'var(--color-off)', marginLeft: '0.5rem' }}>
                    · {c.barber_name}
                  </span>
                  {c.queue_number && (
                    <span style={{ color: 'var(--color-off)', marginLeft: '0.5rem' }}>
                      · Queue #{c.queue_number}
                    </span>
                  )}
                  {c.appointment_datetime && (
                    <span style={{ color: 'var(--color-off)', marginLeft: '0.5rem' }}>
                      · {new Date(c.appointment_datetime).toLocaleString()}
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: 600 }}>₱{c.total_price}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
