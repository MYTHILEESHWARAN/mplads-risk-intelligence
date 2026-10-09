import { getRiskColor } from '../../utils/formatters';

export default function RiskBadge({ level, className = '' }) {
  const c = getRiskColor(level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.badge} ${className}`}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {level}
    </span>
  );
}
