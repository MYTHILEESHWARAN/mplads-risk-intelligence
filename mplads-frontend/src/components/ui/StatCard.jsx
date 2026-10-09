import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, description, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', trend, trendValue, accent }) {
  const trendEl = trend === 'up'
    ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
    : trend === 'down'
    ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    : <Minus className="w-3.5 h-3.5 text-gray-400" />;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {trend && trendEl}
        {trendValue && <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}>{trendValue}</span>}
        {description && <span>{description}</span>}
      </div>
    </div>
  );
}
