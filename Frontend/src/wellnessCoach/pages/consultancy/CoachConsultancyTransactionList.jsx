import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";
import { coachDownloadConsultancyInvoice, coachListConsultancyTransactions } from "../../api/coachConsultancy.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachTableLoaderRow } from "../../components/CoachPageLoader.jsx";
import {
  assigneeLabel,
  ConsultancySearchIcon,
  formatDate,
  formatMoney,
  healthConcernLabel,
  PaymentStatusPill,
} from "../../../components/consultancy/ConsultancyPortalShared.jsx";

export function CoachConsultancyTransactionList() {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [scope, setScope] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, paymentStatus, scope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coachListConsultancyTransactions({
        page: pagination.page,
        limit: pagination.limit,
        paymentStatus,
        search: debouncedSearch || undefined,
        scope,
      });
      setRows(data.transactions);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dispatch, pagination.limit, pagination.page, paymentStatus, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} transactions`,
    [pagination.page, pagination.pages, pagination.total]
  );

  const handleInvoiceDownload = async (row) => {
    setDownloadingId(row.id);
    try {
      await coachDownloadConsultancyInvoice(row.id, row.referenceNumber);
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
    <div className="page-card heal-users-page">
      <div className="page-card__head consultancy-page__head">
        <div className="consultancy-page__intro">
          <h2 className="page-card__title">Consultancy transactions</h2>
          <p className="page-card__desc">
            Payment history for clients in your team — direct, assistant-assigned, or via your referral codes.
          </p>
        </div>
        <div className="page-card__actions user-list-toolbar consultancy-page__toolbar">
          <div className="user-list-filters consultancy-page__filters">
            <div className="search-field consultancy-page__search">
              <ConsultancySearchIcon />
              <input
                type="search"
                placeholder="Search reference, name, email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search transactions"
              />
            </div>
            <select
              className="user-list-status-select"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label="Filter by assignment"
            >
              <option value="all">All related</option>
              <option value="direct">My direct</option>
              <option value="assistant">Assistant clients</option>
            </select>
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
          </div>
          <Link to="/coach/consultancy/enrolled-users" className="btn btn--accent">
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
              <th>Meeting with</th>
              <th>Status</th>
              <th>Paid at</th>
              <th className="data-table__actions-col">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={9} label="Loading transactions…" />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <p className="table-placeholder">No consultancy transactions linked to your account yet.</p>
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
                    <div className="data-table__primary">{assigneeLabel(row)}</div>
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
