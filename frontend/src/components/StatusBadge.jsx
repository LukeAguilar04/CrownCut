const statusConfig = {
  available: { label: 'Available', color: '#22C55E', emoji: '🟢' },
  busy: { label: 'Busy', color: '#EF4444', emoji: '🔴' },
  on_break: { label: 'On Break', color: '#F59E0B', emoji: '🟡' },
  off_duty: { label: 'Off Duty', color: '#6B7280', emoji: '⚫' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.off_duty;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.85rem',
        fontWeight: 500,
        background: `${config.color}22`,
        color: config.color,
      }}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}
