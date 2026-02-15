import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

const statusLabels = {
  pending: 'Pending',
  waiting: 'Waiting',
  serving: 'Serving',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export default function MyBookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    api.get('/bookings/my')
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
    
    api.get('/services')
      .then(setServices)
      .catch(() => {});

    // Check for success message from navigation state
    if (location.state?.showSuccess) {
      setSuccessMessage(location.state.message || 'Success!');
      setShowSuccessModal(true);
      // Clear location state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);


  const handleEdit = (booking) => {
    setEditingBooking(booking.id);
    // Get service IDs from booking - need to fetch full booking details
    // For now, use service_id if available, or fetch booking details
    const bookingServices = booking.service_ids || (booking.service_id ? [booking.service_id] : []);
    setSelectedServices(bookingServices);
  };

  const handleUpdateBooking = async (bookingId) => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service');
      return;
    }
    setUpdating(bookingId);
    try {
      // Update existing booking - overwrite old data
      const updatedBooking = await api.patch(`/bookings/${bookingId}`, { 
        serviceIds: selectedServices,
      });
      // Update UI immediately - replace the booking in state
      setBookings(prev => prev.map(b => Number(b.id) === Number(bookingId) ? updatedBooking : b));
      setEditingBooking(null);
      setSelectedServices([]);
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setUpdating(bookingId);
    try {
      // Delete booking from database
      await api.delete(`/bookings/${bookingId}`);
      // Update UI immediately - remove from state
      setBookings(prev => prev.filter(b => Number(b.id) !== Number(bookingId)));
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(null);
    }
  };

  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // Separate ongoing and completed bookings
  const ongoingBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const completedBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const renderBookingCard = (b) => (
    <div
      key={b.id}
      style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
            {b.barber_name}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-off)', marginBottom: '0.35rem' }}>
            {b.booking_type === 'walk_in' ? 'Walk-in' : 'Appointment'}
            {b.queue_number != null && <span style={{ marginLeft: '0.5rem' }}> · Queue #{b.queue_number}</span>}
            {b.appointment_datetime && (
              <span style={{ display: 'block', marginTop: '0.25rem' }}>
                {new Date(b.appointment_datetime).toLocaleString()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                background: '#E5E7EB',
                fontWeight: 500,
              }}
            >
              {statusLabels[b.status] || b.status}
            </span>
            {b.service_name && <span style={{ fontSize: '0.85rem', color: 'var(--color-off)' }}>{b.service_name}</span>}
            {b.payment_method && (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-off)' }}>
                · {b.payment_method === 'cash' ? 'Cash' : b.payment_method === 'e-payment' ? 'E-Payment' : b.payment_method === 'card' ? 'Card' : b.payment_method}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>₱{b.total_price}</div>
      </div>

      {editingBooking === b.id ? (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: 600 }}>Edit Services</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {services.map((s) => (
              <label
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  border: `1px solid ${selectedServices.includes(s.id) ? 'var(--color-gold)' : '#E5E7EB'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                <span style={{ flex: 1 }}>{s.name}</span>
                <span style={{ fontWeight: 600 }}>₱{s.price_php}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => handleUpdateBooking(b.id)}
              disabled={updating === b.id || selectedServices.length === 0}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-charcoal)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {updating === b.id ? 'Updating...' : 'Update Booking'}
            </button>
            <button
              onClick={() => { setEditingBooking(null); setSelectedServices([]); }}
              style={{
                padding: '0.5rem 1rem',
                background: '#E5E7EB',
                color: 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {['waiting', 'pending'].includes(b.status) && (
            <>
              <button
                onClick={() => handleEdit(b)}
                disabled={updating === b.id}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--color-gold)',
                  color: 'var(--color-ink)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleCancelBooking(b.id)}
                disabled={updating === b.id}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#EF4444',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {updating === b.id ? 'Deleting...' : 'Cancel Booking'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>My Bookings</h1>
      
      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              padding: '2rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Thank you!
              </h2>
              <p style={{ color: 'var(--color-ink)', marginBottom: '1.5rem' }}>
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'var(--color-charcoal)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ongoing Bookings */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔼</span> Ongoing Bookings
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ongoingBookings.length === 0 ? (
            <p style={{ color: 'var(--color-off)' }}>No ongoing bookings</p>
          ) : (
            ongoingBookings.map(renderBookingCard)
          )}
        </div>
      </div>

      {/* Completed Bookings */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔽</span> Completed Bookings
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {completedBookings.length === 0 ? (
            <p style={{ color: 'var(--color-off)' }}>No completed bookings</p>
          ) : (
            completedBookings.map(renderBookingCard)
          )}
        </div>
      </div>
    </div>
  );
}
