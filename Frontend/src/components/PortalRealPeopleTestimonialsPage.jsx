export function PortalRealPeopleTestimonialsPage({
  title = "Real people testimonials",
}) {
  return (
    <div className="user-page">
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="data-table__muted" style={{ marginBottom: 0 }}>
          Real People : Real Healing stories are created and managed by admin only.
          Approve / reject is no longer required for this section.
        </p>
      </div>
    </div>
  );
}
