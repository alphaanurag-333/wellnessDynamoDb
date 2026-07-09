import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminDownloadConsultancyInvoice, adminListConsultancyTransactions } from "../../api/adminConsultancy.js";
import { logout } from "../../../store/authSlice.js";
import { UserTableLoaderRow } from "../user/UserPageLoader.jsx";
import { AdminListHeader } from "../../components/AdminCrud.jsx";
import { healthConcernLabel } from "../../../components/consultancy/ConsultancyPortalShared.jsx";

const LIST_SEARCH_MAX_LEN = 50;
const REFERRAL_CODE_MAX_LEN = 20;

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

export function ConsultancyTransactionList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [referralCode, setReferralCode] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
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

  const hasFilters = Boolean(search.trim() || paymentStatus !== "all" || referralCode.trim());

  const clearFilters = () => {
    setSearch("");
    setPaymentStatus("all");
    setReferralCode("");
  };

  const handleInvoiceDownload = async (row) => {
    setDownloadingId(row.id);
    try {
      await adminDownloadConsultancyInvoice(row.id, row.referenceNumber);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Download failed",
        text: e?.message || "Invoice could not be downloaded.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-card">
      <AdminListHeader
        title="Consultancy transactions"
        subtitle="Consultancy session payments across coaches, assistants, and admin-assigned meetings."
        actions={
          <Link to="/admin/consultancy/enrolled-users" className="btn btn--accent">
            Enrolled users
          </Link>
        }
      />

      <div className="admin-crud-filters">
        <label className="user-field admin-crud-filters__search">
          <span className="user-field__label">Search</span>
          <input
            className="user-field__input"
            type="search"
            placeholder="Reference, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
            maxLength={LIST_SEARCH_MAX_LEN}
            aria-label="Search transactions"
          />
        </label>
        {/* <label className="user-field admin-crud-filters__select">
          <span className="user-field__label">Status</span>
          <select
            className="user-field__input"
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
        </label> */}
        <label className="user-field admin-crud-filters__select">
          <span className="user-field__label">Referral code</span>
          <input
            className="user-field__input consultancy-page__referral-input"
            type="text"
            placeholder="e.g. NDBTK8HU"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, REFERRAL_CODE_MAX_LEN))}
            maxLength={REFERRAL_CODE_MAX_LEN}
            aria-label="Filter by referral code"
          />
        </label>
        {hasFilters ? (
          <button type="button" className="btn btn--ghost" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
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
                    {row.paymentStatus === "paid" ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={downloadingId === row.id}
                        onClick={() => handleInvoiceDownload(row)}
                      >
                        {downloadingId === row.id ? "…" : "PDF"}
                      </button>
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
