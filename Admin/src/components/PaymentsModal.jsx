import { formatPaymentAmount } from "../data/revenueAnalytics.js";

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function PaymentsModal({
  open,
  monthLabel,
  payments = [],
  loading = false,
  error = "",
  onClose,
  onOpenClient,
}) {
  if (!open) return null;

  const rows = Array.isArray(payments) ? payments : [];
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const countLabel = `${rows.length} payment${rows.length === 1 ? "" : "s"}`;
  const subtitle = loading
    ? "Loading payments…"
    : `${countLabel} · ${formatPaymentAmount(total)} collected · tap a row to open the client`;

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-payments-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="payments-modal-title"
      >
        <div className="ua-team-modal__head">
          <span className="ua-team-modal__head-icon ua-payments-modal__icon" aria-hidden="true">
            <CardIcon />
          </span>
          <div className="ua-team-modal__head-copy">
            <div id="payments-modal-title" className="ua-team-modal__title">
              Payments · {monthLabel || "This month"}
            </div>
            <div className="ua-team-modal__sub">{subtitle}</div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-payments-modal__body">
          {loading ? (
            <div className="ua-prog-cat-modal__empty">Loading payments…</div>
          ) : error ? (
            <div className="ua-prog-cat-modal__empty">{error}</div>
          ) : rows.length === 0 ? (
            <div className="ua-prog-cat-modal__empty">No payments collected in this month yet.</div>
          ) : (
            <>
              <div className="ua-payments-modal__table-head">
                <div>User</div>
                <div>Wellness coach</div>
                <div>Type</div>
                <div>Date</div>
                <div>Amount</div>
              </div>
              {rows.map((row) => (
                <button
                  key={row.id || `${row.userName}-${row.paidAt}`}
                  type="button"
                  className="ua-payments-modal__row"
                  onClick={() => onOpenClient(row)}
                >
                  <span className="ua-payments-modal__user">{row.userName}</span>
                  <span className="ua-payments-modal__coach">{row.coachName || "—"}</span>
                  <span className="ua-payments-modal__program">
                    <span
                      className={`ua-payments-modal__badge${
                        String(row.productType || "").toLowerCase() === "consultancy" ||
                        String(row.programType || "").toLowerCase() === "consultation"
                          ? " ua-payments-modal__badge--consult"
                          : ""
                      }`}
                    >
                      {row.programType || "—"}
                    </span>
                  </span>
                  <span className="ua-payments-modal__date">{row.dateLabel}</span>
                  <span className="ua-payments-modal__amount">{formatPaymentAmount(row.amount)}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="ua-team-modal__foot">
          <button type="button" className="ua-team-modal__close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
