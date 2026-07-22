import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminDownloadProgramInvoice,
  adminListProgramTransactions,
} from "../../api/adminProgramCatalog.js";
import { logout } from "../../../store/authSlice.js";
import { UserTableLoaderRow } from "../user/UserPageLoader.jsx";
import { AdminListHeader } from "../../components/AdminCrud.jsx";
import { formatDateTime as formatDate } from "../../utils/formatDate.js";

const LIST_SEARCH_MAX_LEN = 50;

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toFixed(2)}`;
}

function PaymentStatusPill({ status }) {
  const value = String(status || "").toLowerCase();
  return <span className={`payment-status-pill payment-status-pill--${value || "pending"}`}>{value || "—"}</span>;
}

export function ProgramTransactionList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, paymentStatus]);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const data = await adminListProgramTransactions(adminToken, {
        page: pagination.page,
        limit: pagination.limit,
        paymentStatus,
        search: debouncedSearch || undefined,
      });
      setRows(data.transactions);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, pagination.limit, pagination.page, paymentStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} transactions`,
    [pagination.page, pagination.pages, pagination.total]
  );

  const handleInvoiceDownload = async (row) => {
    if (!adminToken) return;
    setDownloadingId(row.id);
    try {
      await adminDownloadProgramInvoice(adminToken, row.id, row.referenceNumber);
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Download failed", text: e?.message || "Invoice could not be downloaded." });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-card">
      <AdminListHeader
        title="Wellness Program transactions"
        subtitle="One-time Wellness Program purchases by users."
        actions={
          <Link to="/admin/programs" className="btn btn--ghost">Back to catalog</Link>
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
          />
        </label>
        {/* <label className="user-field admin-crud-filters__select">
          <span className="user-field__label">Payment status</span>
          <select className="user-field__input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label> */}
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Paid at</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableLoaderRow colSpan={6} label="Loading transactions..." />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}>No transactions found.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="data-table__muted">{row.referenceNumber || row.id}</td>
                  <td>{row.userSnapshot?.name || row.userSnapshot?.email || "—"}</td>
                  <td>{formatMoney(row.totalAmount)}</td>
                  <td><PaymentStatusPill status={row.paymentStatus} /></td>
                  <td className="data-table__muted">{formatDate(row.paidAt)}</td>
                  <td>
                    {String(row.paymentStatus).toLowerCase() === "paid" ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={downloadingId === row.id}
                        onClick={() => handleInvoiceDownload(row)}
                      >
                        {downloadingId === row.id ? "..." : "PDF"}
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination.pages > 1 ? (
        <div className="user-list-pagination">
          <span className="user-list-pagination__info">{pageInfo}</span>
          <div className="user-list-pagination__btns">
            <button type="button" className="btn btn--ghost" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</button>
            <button type="button" className="btn btn--ghost" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
