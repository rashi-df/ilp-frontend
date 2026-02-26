import { ArrowUp, ArrowDown } from 'lucide-react';

const colorMap = {
  primary: {
    iconBg: 'bg-primary-50 text-primary',
  },
  success: {
    iconBg: 'bg-success-bg text-success',
  },
  warning: {
    iconBg: 'bg-warning-bg text-warning',
  },
  danger: {
    iconBg: 'bg-danger-bg text-danger',
  },
};

export default function StatsCard({ title, value, trend, trendUp, icon: Icon, color = 'primary' }) {
  const palette = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-white rounded-xl border border-surface-border p-5 flex items-start justify-between">
      {/* Left content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${palette.iconBg}`}>
            {Icon && <Icon className="w-5 h-5" />}
          </div>
        </div>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      </div>

      {/* Trend badge */}
      {trend && (
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trendUp
              ? 'bg-success-bg text-success'
              : 'bg-danger-bg text-danger'
          }`}
        >
          {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}
