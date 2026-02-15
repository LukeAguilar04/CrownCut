import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function BarberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [queueResult, setQueueResult] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      api.get(`/barbers/${id}`),
      api.get('/services'),
    ])
      .then(([b, s]) => {
        setBarber(b);
        setServices(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (barber) {
      api.get(`/barbers/${id}/slots?date=${slotDate}`)
        .then((availableSlots) => {
          // Filter out already booked slots - backend should handle this, but we'll validate on frontend too
          setSlots(availableSlots);
        })
        .catch((e) => {
          setError('Failed to load available slots');
          setSlots([]);
        });
    }
  }, [barber, id, slotDate]);

  const toggleService = (s) => {
    setSelectedServices((prev) =>
      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
    );
  };

  const totalPrice = selectedServices.reduce(
    (sum, sid) => sum + (services.find((s) => s.id === sid)?.price_php || 0),
    0
  );
  const totalMinutes = selectedServices.reduce(
    (sum, sid) => sum + (services.find((s) => s.id === sid)?.duration_minutes || 0),
    0
  ) || 30;

  const handleJoinQueue = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }
    setActionLoading('queue');
    setError('');
    setQueueResult(null);
    try {
      const res = await api.post('/bookings/walk-in', {
        barberId: parseInt(id),
        serviceIds: selectedServices.length ? selectedServices : [1],
        paymentMethod: selectedPaymentMethod,
      });
      // Redirect immediately to My Bookings with queue info
      navigate('/my-bookings', { state: { showSuccess: true, queueNumber: res.queueNumber, message: `Thank you! Your queue number is #${res.queueNumber}. Please wait for your turn.` } });
    } catch (e) {
      setError(e.message);
      setActionLoading('');
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }
    // Check if slot is still available
    if (!slots.includes(selectedSlot)) {
      setError('This time slot is no longer available. Please select another time.');
      // Refresh slots
      api.get(`/barbers/${id}/slots?date=${slotDate}`).then(setSlots).catch(() => {});
      return;
    }
    setActionLoading('appointment');
    setError('');
    setBookingResult(null);
    try {
      const res = await api.post('/bookings/appointment', {
        barberId: parseInt(id),
        serviceIds: selectedServices.length ? selectedServices : [1],
        datetime: selectedSlot,
        paymentMethod: selectedPaymentMethod,
      });
      // Redirect immediately to My Bookings with success message
      const msg = res.queueNumber
        ? `Thank you! Your queue number is #${res.queueNumber}. Your appointment has been booked.`
        : 'Thank you! Your appointment has been booked successfully.';
      navigate('/my-bookings', { state: { showSuccess: true, queueNumber: res.queueNumber, message: msg } });
    } catch (e) {
      setError(e.message || 'This time slot may already be booked. Please try another time.');
      // Refresh slots on error
      api.get(`/barbers/${id}/slots?date=${slotDate}`).then(setSlots).catch(() => {});
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!barber) return <p>Barber not found</p>;

  return (
    <div>
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            height: 200,
            background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #4a4a4a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '5rem',
          }}
        >
          ✂️
        </div>
        <div style={{ padding: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>{barber.name}</h1>
          <p style={{ color: 'var(--color-off)', marginBottom: '0.75rem' }}>
            {barber.years_experience} years experience
          </p>
          <StatusBadge status={barber.status} />
          <div style={{ marginTop: '1rem' }}>
            <strong>Queue count:</strong> {barber.queue_count ?? 0}
          </div>
        </div>
      </div>


      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#B91C1C',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Service Selection */}
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Select Services</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {services.map((s) => (
            <label
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                border: `2px solid ${selectedServices.includes(s.id) ? 'var(--color-gold)' : '#E5E7EB'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedServices.includes(s.id) ? '#C9A22711' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selectedServices.includes(s.id)}
                onChange={() => toggleService(s)}
              />
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ color: 'var(--color-off)' }}>{s.duration_minutes} min</span>
              <span style={{ fontWeight: 600 }}>₱{s.price_php}</span>
            </label>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>
          Total: ₱{totalPrice || 200} ({totalMinutes} min)
        </p>
      </div>

      {/* Walk-In */}
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ marginBottom: '0.75rem' }}>Join Walk-In Queue</h2>
        <p style={{ color: 'var(--color-off)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Get a queue number and wait for your turn
        </p>
        
        {/* Payment Method Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Method</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('cash')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'cash' ? 'var(--color-charcoal)' : '#E5E7EB',
                color: selectedPaymentMethod === 'cash' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('e-payment')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'e-payment' ? '#3B82F6' : '#E5E7EB',
                color: selectedPaymentMethod === 'e-payment' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              E-Payment
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('card')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'card' ? '#10B981' : '#E5E7EB',
                color: selectedPaymentMethod === 'card' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Card
            </button>
          </div>
        </div>

        <button
          onClick={handleJoinQueue}
          disabled={actionLoading || barber.status === 'off_duty' || !selectedPaymentMethod}
          style={{
            padding: '0.75rem 1.5rem',
            background: barber.status === 'off_duty' || !selectedPaymentMethod ? '#9CA3AF' : 'var(--color-charcoal)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 600,
          }}
        >
          {actionLoading === 'queue' ? 'Joining...' : 'Join Queue'}
        </button>
      </div>

      {/* Appointment */}
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ marginBottom: '0.75rem' }}>Book Appointment</h2>
        <p style={{ color: 'var(--color-off)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Appointments are served before walk-ins
        </p>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date</label>
        <input
          type="date"
          value={slotDate}
          onChange={(e) => setSlotDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          style={{
            width: '100%',
            maxWidth: 300,
            padding: '0.75rem',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        />
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Time Slot</label>
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 300,
            padding: '0.75rem',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <option value="">Select time</option>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {new Date(slot).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </option>
          ))}
        </select>
        
        {/* Payment Method Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Method</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('cash')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'cash' ? 'var(--color-charcoal)' : '#E5E7EB',
                color: selectedPaymentMethod === 'cash' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('e-payment')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'e-payment' ? '#3B82F6' : '#E5E7EB',
                color: selectedPaymentMethod === 'e-payment' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              E-Payment
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('card')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedPaymentMethod === 'card' ? '#10B981' : '#E5E7EB',
                color: selectedPaymentMethod === 'card' ? 'white' : 'var(--color-ink)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Card
            </button>
          </div>
        </div>

        <button
          onClick={handleBookAppointment}
          disabled={actionLoading || !selectedPaymentMethod}
          style={{
            padding: '0.75rem 1.5rem',
            background: !selectedPaymentMethod ? '#9CA3AF' : 'var(--color-gold)',
            color: 'var(--color-ink)',
            borderRadius: '8px',
            fontWeight: 600,
          }}
        >
          {actionLoading === 'appointment' ? 'Booking...' : 'Book Appointment'}
        </button>
      </div>
    </div>
  );
}
