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

const PIE_COLORS = ["#10b981", "#2563eb", "#f59e0b", "#a855f7", "#6366f1", "#94a3b8"];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-dashboard-chart__tooltip">
      {label ? <strong>{label}</strong> : null}
      <div>{payload[0]?.value}</div>
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
        {empty ? <p className="admin-dashboard-chart__empty">{emptyMessage}</p> : children}
      </div>
    </article>
  );
}

export function CoachDashboardCharts({ charts }) {
  const teamOverview = charts?.teamOverview ?? [];
  const clientOverview = charts?.clientOverview ?? [];
  const pendingApprovals = charts?.pendingApprovals ?? [];
  const clientTiers = charts?.clientTiers ?? [];

  const hasTeam = teamOverview.some((row) => row.value > 0);
  const hasClients = clientOverview.some((row) => row.value > 0);
  const hasPending = pendingApprovals.some((row) => row.value > 0);
  const hasTiers = clientTiers.some((row) => row.value > 0);

  return (
    <section className="admin-dashboard-charts" aria-label="Dashboard charts">
      <div className="admin-dashboard-charts__grid">
        <ChartPanel
          title="Assistant team"
          subtitle="Active vs inactive assistants under your account"
          empty={!hasTeam}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={teamOverview} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "#374151", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
                {teamOverview.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Assigned clients"
          subtitle="Heal vs consultancy clients in your hierarchy"
          empty={!hasClients}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={clientOverview} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "#374151", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
                {clientOverview.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Pending approvals"
          subtitle="Meal logs, testimonials & commitment letters awaiting review"
          empty={!hasPending}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={pendingApprovals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {pendingApprovals.map((entry, index) => (
                  <Cell key={entry.key} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Clients by tier" subtitle="Your coaching client mix" empty={!hasTiers}>
          <div className="admin-dashboard-chart__split">
            <div className="admin-dashboard-chart__plot">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={clientTiers}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {clientTiers.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="admin-dashboard-chart__legend">
              {clientTiers.map((row, index) => (
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
      </div>
    </section>
  );
}
