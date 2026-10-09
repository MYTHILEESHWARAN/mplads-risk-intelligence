import { getRiskFromScore, getRiskColor } from '../../utils/formatters';

export default function RiskScore({ score, showBar = true, size = 'md' }) {
  const level = getRiskFromScore(score);
  const c = getRiskColor(level);

  const sizes = {
    sm: { text: 'text-sm', score: 'text-lg font-bold', label: 'text-xs' },
    md: { text: 'text-base', score: 'text-2xl font-bold', label: 'text-xs' },
    lg: { text: 'text-lg', score: 'text-4xl font-bold', label: 'text-sm' },
  };
  const s = sizes[size] || sizes.md;

  // bar color
  const barColor =
    level === 'LOW' ? 'bg-green-500' :
    level === 'MEDIUM' ? 'bg-yellow-500' :
    level === 'HIGH' ? 'bg-orange-500' :
    'bg-red-500';

  return (
    <div className="flex flex-col gap-1" role="img" aria-label={`Risk score ${score} out of 100, level ${level}`}>
      <div className="flex items-baseline gap-2">
        <span className={`${s.score} ${c.text}`}>{score}</span>
        <span className={`${s.label} text-gray-500`}>/100</span>
        <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold ${c.badge}`}>{level}</span>
      </div>
      {showBar && (
        <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}
