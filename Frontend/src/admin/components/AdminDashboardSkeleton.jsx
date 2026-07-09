export function Skeleton({ className = "", ...props }) {
  return <span className={`admin-skeleton${className ? ` ${className}` : ""}`} aria-hidden="true" {...props} />;
}

export function DashboardStatCardSkeleton() {
  return (
    <article className="stat-card stat-card--dashboard admin-dashboard-stat-skeleton">
      <div className="stat-card__body">
        <Skeleton className="admin-dashboard-stat-skeleton__label" />
        <Skeleton className="admin-dashboard-stat-skeleton__value" />
      </div>
      <Skeleton className="admin-dashboard-stat-skeleton__icon" />
    </article>
  );
}

export function DashboardStatsSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <DashboardStatCardSkeleton key={i} />
      ))}
    </>
  );
}

function BarChartSkeleton() {
  return (
    <div className="admin-dashboard-chart-skeleton admin-dashboard-chart-skeleton--bars">
      <div className="admin-dashboard-chart-skeleton__axis admin-dashboard-chart-skeleton__axis--y" />
      <div className="admin-dashboard-chart-skeleton__bars">
        {[68, 42, 55, 36, 48, 72].map((h, i) => (
          <Skeleton key={i} className="admin-dashboard-chart-skeleton__bar" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="admin-dashboard-chart-skeleton__axis admin-dashboard-chart-skeleton__axis--x" />
    </div>
  );
}

function HorizontalBarChartSkeleton() {
  const widths = [72, 48, 56, 40];
  return (
    <div className="admin-dashboard-chart-skeleton admin-dashboard-chart-skeleton--horizontal">
      {widths.map((w, i) => (
        <div key={i} className="admin-dashboard-chart-skeleton__row">
          <Skeleton className="admin-dashboard-chart-skeleton__row-label" />
          <Skeleton className="admin-dashboard-chart-skeleton__row-bar" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function DonutChartSkeleton() {
  return (
    <div className="admin-dashboard-chart-skeleton admin-dashboard-chart-skeleton--donut">
      <Skeleton className="admin-dashboard-chart-skeleton__donut" />
      <ul className="admin-dashboard-chart-skeleton__legend">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <Skeleton className="admin-dashboard-chart-skeleton__legend-dot" />
            <Skeleton className="admin-dashboard-chart-skeleton__legend-text" />
            <Skeleton className="admin-dashboard-chart-skeleton__legend-value" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardChartPanelSkeleton({ title, subtitle, variant = "bar" }) {
  let body = <BarChartSkeleton />;
  if (variant === "horizontal") body = <HorizontalBarChartSkeleton />;
  if (variant === "donut") body = <DonutChartSkeleton />;

  return (
    <article className="admin-dashboard-chart admin-dashboard-chart--skeleton">
      <header className="admin-dashboard-chart__head">
        {title ? <h3 className="admin-dashboard-chart__title">{title}</h3> : <Skeleton className="admin-dashboard-chart-skeleton__title" />}
        {subtitle ? (
          <p className="admin-dashboard-chart__subtitle">{subtitle}</p>
        ) : (
          <Skeleton className="admin-dashboard-chart-skeleton__subtitle" />
        )}
      </header>
      <div className="admin-dashboard-chart__body">{body}</div>
    </article>
  );
}

export function DashboardChartsSkeleton() {
  return (
    <section className="admin-dashboard-charts" aria-label="Loading dashboard charts" aria-busy="true">
      <div className="admin-dashboard-charts__grid">
        <DashboardChartPanelSkeleton title="Revenue trend" subtitle="Paid transactions — last 6 months" variant="bar" />
        <DashboardChartPanelSkeleton title="Platform overview" subtitle="Users, coaches, assistants & programs" variant="horizontal" />
        <DashboardChartPanelSkeleton title="Users by tier" subtitle="Seek, Heal & consultancy-only clients" variant="donut" />
        <DashboardChartPanelSkeleton title="Revenue by product" subtitle="Breakdown of paid revenue" variant="bar" />
      </div>
    </section>
  );
}
