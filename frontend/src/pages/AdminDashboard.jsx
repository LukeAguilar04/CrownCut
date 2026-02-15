import { useState, useEffect } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

const statusOpts = ['available', 'busy', 'on_break', 'off_duty'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberYears, setNewBarberYears] = useState('');

  const fetchData = () => {
    api.get('/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateBarberStatus = async (barberId, status) => {
    setUpdating(barberId);
    try {
      await api.patch(`/barbers/${barberId}/status`, { status });
      fetchData();
    } finally {
      setUpdating(null);
    }
  };

  const completeBooking = async (bookingId) => {
    setUpdating(bookingId);
    try {
      await api.patch(`/admin/bookings/${bookingId}/complete`);
      fetchData();
    } finally {
      setUpdating(null);
    }
  };

  const createBarber = async () => {
    if (!newBarberName.trim()) {
      alert('Please enter a barber name');
      return;
    }
    setUpdating('create');
    try {
      const newBarber = await api.post('/admin/barbers', {
        name: newBarberName.trim(),
        years_experience: parseInt(newBarberYears) || 0,
      });
      // Update UI immediately with barber returned from API
      setData(prev => ({
        ...prev,
        barbers: [...(prev?.barbers || []), newBarber]
      }));
      setNewBarberName('');
      setNewBarberYears('');
      setShowAddBarber(false);
    } catch (e) {
      alert(e.message || 'Failed to create barber');
    } finally {
      setUpdating(null);
    }
  };

  const deleteBarber = async (barberId) => {
    if (!confirm('Are you sure you want to delete this barber? This action cannot be undone.')) {
      return;
    }
    setUpdating(barberId);
    try {
      await api.delete(`/admin/barbers/${barberId}`);
      // Update UI immediately - remove from state
      setData(prev => ({
        ...prev,
        barbers: (prev?.barbers || []).filter(b => Number(b.id) !== Number(barberId))
      }));
    } catch (e) {
      alert(e.message || 'Failed to delete barber');
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

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
      <p style={{ color: 'var(--color-off)', marginBottom: '1.5rem' }}>
        Manage barber status and settings
      </p>

      {/* Barber Status */}
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Barber Status</h2>
          <button
            onClick={() => setShowAddBarber(!showAddBarber)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-gold)',
              color: 'var(--color-ink)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {showAddBarber ? 'Cancel' : '+ Add Barber'}
          </button>
        </div>

        {showAddBarber && (
          <div
            style={{
              padding: '1rem',
              background: '#F9FAFB',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '2px dashed #E5E7EB',
            }}
          >
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Add New Barber</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Barber Name"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                }}
              />
              <input
                type="number"
                placeholder="Years of Experience"
                value={newBarberYears}
                onChange={(e) => setNewBarberYears(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={createBarber}
                  disabled={updating === 'create'}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--color-charcoal)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  {updating === 'create' ? 'Creating...' : 'Create Barber'}
                </button>
                <button
                  onClick={() => {
                    setShowAddBarber(false);
                    setNewBarberName('');
                    setNewBarberYears('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#E5E7EB',
                    color: 'var(--color-ink)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data?.barbers?.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '0.75rem',
                background: '#F9FAFB',
                borderRadius: '8px',
              }}
            >
              <div>
                <strong>{b.name}</strong>
                <span style={{ marginLeft: '0.75rem' }}>
                  <StatusBadge status={b.status} />
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {statusOpts.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateBarberStatus(b.id, s)}
                    disabled={updating === b.id}
                    style={{
                      padding: '0.35rem 0.65rem',
                      background: b.status === s ? 'var(--color-charcoal)' : '#E5E7EB',
                      color: b.status === s ? 'white' : 'var(--color-ink)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
                <button
                  onClick={() => deleteBarber(b.id)}
                  disabled={updating === b.id}
                  style={{
                    padding: '0.35rem 0.65rem',
                    background: '#EF4444',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
