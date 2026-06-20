import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminListConsultancyTransactions, adminConsultancyInvoiceUrl } from "../../api/adminConsultancy.js";
import { logout } from "../../../store/authSlice.js";
import { UserTableLoaderRow } from "../user/UserPageLoader.jsx";
import { healthConcernLabel } from "../../../components/consultancy/ConsultancyPortalShared.jsx";

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function PaymentStatusPill({ status }) {
  const value = String(status || "").toLowerCase();
  return <span className={`payment-status-pill payment-status-pill--${value || "pending"}`}>{value || "—"}</span>;
}

function SearchIcon() {
  return (
    <span className="search-field__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </span>
  );
}

export function ConsultancyTransactionList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [referralCode, setReferralCode] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, paymentStatus, referralCode]);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const data = await adminListConsultancyTransactions(adminToken, {
        page: pagination.page,
        limit: pagination.limit,
        paymentStatus,
        referralCode: referralCode || undefined,
        search: debouncedSearch || undefined,
      });
      setRows(data.transactions);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, pagination.limit, pagination.page, paymentStatus, referralCode]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} transactions`,
    [pagination.page, pagination.pages, pagination.total]
  );

  return (
    <div className="page-card">
      <div className="page-card__head consultancy-page__head">
        <div className="consultancy-page__intro">
          <h2 className="page-card__title">Consultancy transactions</h2>
          <p className="page-card__desc">
            All payments across coaches, assistants, and admin-assigned meetings.
          </p>
        </div>
        <div className="page-card__actions user-list-toolbar consultancy-page__toolbar">
          <div className="user-list-filters consultancy-page__filters">
            <div className="search-field consultancy-page__search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search reference, name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search transactions"
              />
            </div>
            <select
              className="user-list-status-select"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <input
              className="consultancy-page__referral-input"
              type="text"
              placeholder="Referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              aria-label="Filter by referral code"
            />
          </div>
          <Link to="/admin/consultancy/enrolled-users" className="btn btn--accent">
            Enrolled users
          </Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Client</th>
              <th>Health concern</th>
              <th>Amount</th>
              <th>Referral</th>
              <th>Assigned to</th>
              <th>Status</th>
              <th>Paid at</th>
              <th className="data-table__actions-col">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableLoaderRow colSpan={9} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <p className="table-placeholder">
                    No transactions found. Completed consultancy payments will appear here after users pay through
                    the app.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="data-table__mono">
                    <strong>{row.referenceNumber}</strong>
                  </td>
                  <td>
                    <div className="data-table__primary">{row.userSnapshot?.name || "—"}</div>
                    <div className="data-table__muted">{row.userSnapshot?.email || "—"}</div>
                  </td>
                  <td>{healthConcernLabel(row)}</td>
                  <td>{formatMoney(row.totalAmount)}</td>
                  <td className="data-table__mono">{row.referralCodeUsed || "—"}</td>
                  <td>
                    <div className="data-table__primary">{row.assigneeSnapshot?.name || row.meetingAssigneeType || "—"}</div>
                    <div className="data-table__muted">{row.meetingAssigneeType || "—"}</div>
                  </td>
                  <td>
                    <PaymentStatusPill status={row.paymentStatus} />
                  </td>
                  <td>{formatDate(row.paidAt || row.createdAt)}</td>
                  <td>
                    {row.paymentStatus === "paid" && (row.invoiceUrl || row.invoicePdfKey) ? (
                      <a
                        href={row.invoiceUrl || adminConsultancyInvoiceUrl(row.id)}
                        className="btn btn--ghost btn--sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && pagination.pages > 1 ? (
        <div className="user-list-pagination">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span className="user-list-pagination__info">{pageInfo}</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
