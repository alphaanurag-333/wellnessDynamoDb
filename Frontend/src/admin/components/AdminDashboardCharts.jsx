import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#a855f7", "#6366f1", "#14b8a6"];

function formatCurrency(value, currency = "INR") {
  const amount = Number(value) || 0;
  if (currency === "INR") {
    return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
  }
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function ChartTooltip({ active, payload, label, currency, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const formatted = valueFormatter ? valueFormatter(value) : value;
  return (
    <div className="admin-dashboard-chart__tooltip">
      {label ? <strong>{label}</strong> : null}
      <div>{formatted}</div>
    </div>
  );
}

function ChartPanel({ title, subtitle, children, empty, emptyMessage = "No data yet" }) {
  return (
    <article className="admin-dashboard-chart">
      <header className="admin-dashboard-chart__head">
        <h3 className="admin-dashboard-chart__title">{title}</h3>
        {subtitle ? <p className="admin-dashboard-chart__subtitle">{subtitle}</p> : null}
      </header>
      <div className="admin-dashboard-chart__body">
        {empty ? (
          <p className="admin-dashboard-chart__empty">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </article>
  );
}

export function AdminDashboardCharts({ charts, currency }) {
  const platformOverview = charts?.platformOverview ?? [];
  const revenueByMonth = charts?.revenueByMonth ?? [];
  const revenueByProduct = charts?.revenueByProduct ?? [];
  const userTiers = charts?.userTiers ?? [];

  const hasRevenue = revenueByMonth.some((row) => row.revenue > 0);
  const hasProductRevenue = revenueByProduct.some((row) => row.value > 0);
  const hasUsers = userTiers.some((row) => row.value > 0);
  const hasPlatform = platformOverview.some((row) => row.value > 0);

  return (
    <section className="admin-dashboard-charts" aria-label="Dashboard charts">
      <div className="admin-dashboard-charts__grid">

      <ChartPanel
          title="Revenue by product"
          subtitle="Breakdown of paid revenue"
          empty={!hasProductRevenue}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByProduct} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    valueFormatter={(v) => formatCurrency(v, currency)}
                  />
                }
              />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {revenueByProduct.map((entry, index) => (
                  <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

     

        <ChartPanel
          title="Platform overview"
          subtitle="Users, coaches, assistants & programs"
          empty={!hasPlatform}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformOverview} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fill: "#374151", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
                {platformOverview.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Users by tier"
          subtitle="Seek, Heal & consultancy-only clients"
          empty={!hasUsers}
        >
          <div className="admin-dashboard-chart__split">
            <div className="admin-dashboard-chart__plot">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userTiers}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {userTiers.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="admin-dashboard-chart__legend">
              {userTiers.map((row, index) => (
                <li key={row.key}>
                  <span
                    className="admin-dashboard-chart__legend-swatch"
                    style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span>{row.name}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Revenue trend"
          subtitle="Paid transactions — last 6 months"
          empty={!hasRevenue}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueFormatter={(v) => formatCurrency(v, currency)}
                  />
                }
              />
              <Bar dataKey="revenue" fill="#14b8a6" radius={[8, 8, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

  
      </div>
    </section>
  );
}
