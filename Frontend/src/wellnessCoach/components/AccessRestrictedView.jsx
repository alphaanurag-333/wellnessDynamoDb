const LOCK_TOOLTIP = "No access — contact your admin.";

export function AccessRestrictedView({
  title = "Access restricted",
  message = LOCK_TOOLTIP,
}) {
  return (
    <div className="page-card" role="alert">
      <h2 className="h5 mb-2">{title}</h2>
      <p className="text-body-secondary mb-0">{message}</p>
    </div>
  );
}

export { LOCK_TOOLTIP };
