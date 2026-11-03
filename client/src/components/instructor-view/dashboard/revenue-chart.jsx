// Monthly revenue bars drawn from the analytics API (no chart library needed for one series)
const WIDTH = 500;
const HEIGHT = 170;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 25;

function RevenueChart({ monthly = [] }) {
  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 0);

  if (!monthly.length) {
    return <div className="h-48 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />;
  }

  const slot = WIDTH / monthly.length;
  const barWidth = Math.min(36, slot * 0.5);
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  return (
    <div className="h-48 w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Monthly revenue for the last six months"
      >
        <line
          x1="0"
          x2={WIDTH}
          y1={HEIGHT - PADDING_BOTTOM}
          y2={HEIGHT - PADDING_BOTTOM}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {monthly.map((month, index) => {
          const height = maxRevenue ? (month.revenue / maxRevenue) * plotHeight : 0;
          const x = index * slot + (slot - barWidth) / 2;
          const y = HEIGHT - PADDING_BOTTOM - height;
          return (
            <g key={`${month.year}-${month.label}`}>
              <rect x={x} y={y} width={barWidth} height={Math.max(height, 1)} rx="4" fill="#6366f1">
                <title>{`${month.label} ${month.year}: $${month.revenue.toFixed(2)} from ${month.sales} sales`}</title>
              </rect>
              {month.revenue > 0 && (
                <text x={x + barWidth / 2} y={y - 6} fontSize="10" fill="#64748b" textAnchor="middle">
                  ${Math.round(month.revenue)}
                </text>
              )}
              <text x={x + barWidth / 2} y={HEIGHT - 8} fontSize="10" fill="#94a3b8" textAnchor="middle">
                {month.label}
              </text>
            </g>
          );
        })}
        {maxRevenue === 0 && (
          <text x={WIDTH / 2} y={HEIGHT / 2} fontSize="12" fill="#94a3b8" textAnchor="middle">
            No paid orders in the last 6 months
          </text>
        )}
      </svg>
    </div>
  );
}

export default RevenueChart;
