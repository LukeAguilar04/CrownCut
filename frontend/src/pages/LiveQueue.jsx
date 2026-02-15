import { useState, useEffect } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function LiveQueue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchData = () => {
    api.get('/admin/dashboard')
      .then((dashboardData) => {
        // Group queue by barber
        const queueByBarber = {};
        (dashboardData.queueList || []).forEach((q) => {
          if (!queueByBarber[q.barber_id]) {
            queueByBarber[q.barber_id] = {
              barber: dashboardData.barbers?.find((b) => b.id === q.barber_id) || { name: 'Unknown', id: q.barber_id },
              queue: [],
            };
          }
          queueByBarber[q.barber_id].queue.push(q);
        });
        setData({
          queueByBarber,
          barbers: dashboardData.barbers || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const completeBooking = async (bookingId) => {
    setUpdating(bookingId);
    try {
      await api.patch(`/admin/bookings/${bookingId}/complete`);
      fetchData();
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const barbersWithQueue = Object.values(data?.queueByBarber || {});
  const barbersWithoutQueue = (data?.barbers || []).filter(
    (b) => !data?.queueByBarber?.[b.id]
  );

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Live Queue</h1>
      <p style={{ color: 'var(--color-off)', marginBottom: '1.5rem' }}>
        Real-time queue management for each barber
      </p>

      {barbersWithQueue.length === 0 && barbersWithoutQueue.length === 0 && (
        <p style={{ color: 'var(--color-off)' }}>No barbers available</p>
      )}

      {/* Barbers with active queue */}
      {barbersWithQueue.map(({ barber, queue }) => (
        <div
          key={barber.id}
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'inline-block', marginRight: '0.75rem' }}>{barber.name}</h2>
              <StatusBadge status={barber.status} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {queue.map((q) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: q.status === 'serving' ? '#DCFCE7' : '#F9FAFB',
                  borderRadius: '8px',
                  border: q.status === 'serving' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {q.customer_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-off)' }}>
                    {q.queue_number && <span>Queue #{q.queue_number}</span>}
                    {q.appointment_datetime && (
                      <span style={{ marginLeft: '0.5rem' }}>
                        Appointment: {new Date(q.appointment_datetime).toLocaleString()}
                      </span>
                    )}
                    {q.booking_type && (
                      <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>
                        ({q.booking_type.replace('_', ' ')})
                      </span>
                    )}
                    {q.payment_method && (
                      <span style={{ marginLeft: '0.5rem', fontWeight: 500 }}>
                        Payment: {q.payment_method === 'cash' ? 'Cash' : q.payment_method === 'e-payment' ? 'E-Payment' : q.payment_method === 'card' ? 'Card' : q.payment_method}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: q.status === 'serving' ? '#22C55E' : '#E5E7EB',
                      color: q.status === 'serving' ? 'white' : 'var(--color-ink)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {q.status}
                  </span>
                  {['waiting', 'serving'].includes(q.status) && (
                    <button
                      onClick={() => completeBooking(q.id)}
                      disabled={updating === q.id}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: '#22C55E',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                      }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Barbers without queue */}
      {barbersWithoutQueue.map((barber) => (
        <div
          key={barber.id}
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0, display: 'inline-block', marginRight: '0.75rem' }}>{barber.name}</h2>
            <StatusBadge status={barber.status} />
          </div>
          <p style={{ color: 'var(--color-off)', marginTop: '0.5rem' }}>No customers in queue</p>
        </div>
      ))}
    </div>
  );
}
