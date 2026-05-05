const stats = [
  { label: "Total Users", value: "12,543", tone: "yellow" },
  { label: "Active Programs", value: "38", tone: "green" },
  { label: "Active Coaches & AWCs", value: "214", tone: "green" },
  { label: "Inactive Coaches & AWCs", value: "12", tone: "orange" },
  { label: "Pending Approvals", value: "27", tone: "orange" },
  { label: "Revenue", value: "$124,567", tone: "yellow" },
  { label: "Payout", value: "$92,340", tone: "orange" },
  { label: "Today Sessions Completed", value: "1,286", tone: "green" },
  { label: "Upcoming Camp Events", value: "16", tone: "orange" },
  { label: "Active Nutrition Plans", value: "4,392", tone: "yellow" },
  { label: "Open Support Tickets", value: "42", tone: "orange" },
  { label: "Program Completion Rate", value: "78.4%", tone: "green" },
];

export function DashboardPage() {
  const statusData = [
    { label: "Active", value: 214, tone: "green" },
    { label: "Inactive", value: 12, tone: "orange" },
  ];
  const totalAwc = statusData.reduce((sum, item) => sum + item.value, 0);
  const financeData = [
    { label: "Revenue", value: 124567, tone: "yellow" },
    { label: "Payout", value: 92340, tone: "orange" },
  ];
  const maxFinanceValue = Math.max(...financeData.map((item) => item.value));

  return (
    <div className="page-stack">
      <section className="stat-grid" aria-label="Quick insights">
        {stats.map((s) => (
          <article key={s.label} className={`stat-card stat-card--${s.tone}`}>
            <div className="stat-card__meta">
              <div className="stat-card__label">{s.label}</div>
              <div className="stat-card__value">{s.value}</div>
            </div>
            <div className="stat-card__icon" aria-hidden="true" />
          </article>
        ))}
      </section>

      <section className="panel-row">
        <div className="panel">
          <h2 className="panel__title">Monthly Wellness Enrollment</h2>
          <p className="panel__hint">Jan – Jun (demo trend)</p>
          <div className="spark" role="img" aria-label="Trend up">
            <svg viewBox="0 0 320 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f4965d" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f4965d" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 90 L60 70 L120 80 L180 40 L240 55 L320 20 L320 120 L0 120 Z"
                fill="url(#sparkFill)"
              />
              <path
                d="M0 90 L60 70 L120 80 L180 40 L240 55 L320 20"
                fill="none"
                stroke="#e07d45"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="panel">
          <h2 className="panel__title">Program Performance</h2>
          <p className="panel__hint">Sample wellness categories</p>
          <div className="bars" role="img" aria-label="Bar chart placeholder">
            {["Maternal Care", "Child Care", "Nutrition", "Fitness", "Mental Wellness"].map((name, i) => (
              <div key={name} className="bars__item">
                <div className="bars__track">
                  <div className="bars__fill" style={{ height: `${45 + i * 10}%` }} />
                </div>
                <span className="bars__label">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-row">
        <div className="panel">
          <h2 className="panel__title">Coaches & AWCs Status</h2>
          <p className="panel__hint">Active vs Inactive</p>
          <div className="status-stack" role="img" aria-label="Active and inactive ratio">
            <div className="status-stack__bar">
              {statusData.map((item) => (
                <div
                  key={item.label}
                  className={`status-stack__fill status-stack__fill--${item.tone}`}
                  style={{ width: `${Math.round((item.value / totalAwc) * 100)}%` }}
                />
              ))}
            </div>

            <div className="status-stack__legend">
              {statusData.map((item) => (
                <div key={item.label} className="status-stack__legend-item">
                  <span className={`status-stack__dot status-stack__dot--${item.tone}`} aria-hidden="true" />
                  <span className="status-stack__label">{item.label}</span>
                  <span className="status-stack__value">{item.value}</span>
                  <span className="status-stack__percent">
                    ({Math.round((item.value / totalAwc) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel__title">Revenue vs Payout</h2>
          <p className="panel__hint">Current month comparison</p>
          <div className="metric-compare" role="img" aria-label="Revenue and payout comparison">
            {financeData.map((item) => (
              <div key={item.label} className="metric-compare__row">
                <div className="metric-compare__head">
                  <span className="metric-compare__label">{item.label}</span>
                  <span className="metric-compare__value">${item.value.toLocaleString()}</span>
                </div>
                <div className="metric-compare__track">
                  <div
                    className={`metric-compare__fill metric-compare__fill--${item.tone}`}
                    style={{ width: `${Math.round((item.value / maxFinanceValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* <section className="panel">
        <h2 className="panel__title">Recent Activity</h2>
        <ul className="activity-list">
          {activities.map((a) => (
            <li key={a.title} className="activity-list__item">
              <div>
                <div className="activity-list__title">{a.title}</div>
                <div className="activity-list__meta">{a.meta}</div>
                <div className="activity-list__mobile">Mobile: {a.mobile}</div>
              </div>
            </li>
          ))}
        </ul>
      </section> */}
    </div>
  );
}
