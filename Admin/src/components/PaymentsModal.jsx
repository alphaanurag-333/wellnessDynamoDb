import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDashboardPayments } from "../api/dashboardApi.js";
import {
  DASHBOARD_PAYMENT_TABS,
  dashboardPaymentTabLabel,
  enrichLivePayments,
  formatPaymentAmount,
} from "../data/revenueAnalytics.js";
import { PillTabs } from "./shared.jsx";

const PAGE_SIZE = 25;

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
  monthKey,
  monthLabel,
  clients = [],
  healthConcerns = [],
  onClose,
  onOpenClient,
}) {
  const [productTab, setProductTab] = useState("consultancy");
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ count: 0, totalAmount: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, hasMore: false });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const productTabs = useMemo(
    () => DASHBOARD_PAYMENT_TABS.map((tab) => ({
      ...tab,
      count: tab.id === productTab ? summary.count : null,
    })),
    [productTab, summary.count],
  );

  const loadPayments = useCallback(async ({ page = 1, append = false, type = productTab } = {}) => {
    if (!monthKey) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const result = await fetchDashboardPayments({
        month: monthKey,
        type,
        page,
        limit: PAGE_SIZE,
      });
      if (requestRef.current !== requestId) return;

      const rows = enrichLivePayments(result.payments, { clients, healthConcerns });
      setPayments((current) => (append ? [...current, ...rows] : rows));
      setSummary(result.summary || { count: 0, totalAmount: 0 });
      setPagination(result.pagination || { page, pages: 1, hasMore: false });
    } catch (loadError) {
      if (requestRef.current !== requestId) return;
      if (!append) setPayments([]);
      setSummary({ count: 0, totalAmount: 0 });
      setPagination({ page: 1, pages: 1, hasMore: false });
      setError(loadError?.message || "Couldn’t load payments for this month.");
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [clients, healthConcerns, monthKey, productTab]);

  useEffect(() => {
    if (!open) return undefined;
    setProductTab("consultancy");
    return undefined;
  }, [open, monthKey]);

  useEffect(() => {
    if (!open || !monthKey) return undefined;
    loadPayments({ page: 1, append: false, type: productTab });
    return () => {
      requestRef.current += 1;
    };
  }, [open, monthKey, productTab, loadPayments]);

  if (!open) return null;

  const countLabel = `${summary.count || payments.length} payment${(summary.count || payments.length) === 1 ? "" : "s"}`;
  const subtitle = loading
    ? "Loading payments…"
    : `${countLabel} · ${formatPaymentAmount(summary.totalAmount)} collected · ${dashboardPaymentTabLabel(productTab)} · tap a row to open the client`;

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-payments-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="payments-modal-title"
      >
        <div className="ua-team-modal__head ua-payments-modal__head">
          <span className="ua-team-modal__head-icon ua-payments-modal__icon" aria-hidden="true">
            <CardIcon />
          </span>
          <div className="ua-team-modal__head-copy">
            <div id="payments-modal-title" className="ua-team-modal__title">
              Payments · {monthLabel || "This month"}
            </div>
            <div className="ua-team-modal__sub">{subtitle}</div>
          </div>
          <div className="ua-payments-modal__tabs">
            <PillTabs
              tabs={productTabs}
              active={productTab}
              onChange={setProductTab}
              size="sm"
            />
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-payments-modal__body">
          {loading ? (
            <div className="ua-payments-modal__state" role="status" aria-live="polite" aria-busy="true">
              <span className="ua-payments-modal__spinner" aria-hidden="true" />
              <span>Loading payments…</span>
            </div>
          ) : error ? (
            <div className="ua-payments-modal__state ua-payments-modal__state--message">{error}</div>
          ) : payments.length === 0 ? (
            <div className="ua-payments-modal__state ua-payments-modal__state--message">
              No {dashboardPaymentTabLabel(productTab).toLowerCase()} payments collected in this month yet.
            </div>
          ) : (
            <div className="ua-payments-modal__content">
              <div className="ua-payments-modal__table-head">
                <div>User</div>
                <div>Wellness coach</div>
                <div>Type</div>
                <div>Date</div>
                <div>Amount</div>
              </div>
              {payments.map((row) => (
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

              {pagination.hasMore ? (
                <div className="ua-payments-modal__loadmore">
                  <button
                    type="button"
                    className="ua-payments-modal__loadmore-btn"
                    disabled={loadingMore}
                    onClick={() => loadPayments({ page: (pagination.page || 1) + 1, append: true, type: productTab })}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : payments.length > 0 ? (
                <div className="ua-payments-modal__end">
                  Showing all {payments.length} payment{payments.length === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>
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
