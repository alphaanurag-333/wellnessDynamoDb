import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminListEnrolledUsers } from "../../api/adminConsultancy.js";
import { logout } from "../../../store/authSlice.js";
import { UserTableLoaderRow } from "../user/UserPageLoader.jsx";
import { formatAssignedCoachLabel } from "../../../components/ReferralAssignmentShared.jsx";
import { healthConcernLabel } from "../../../components/consultancy/ConsultancyPortalShared.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function enrollmentLabel(status) {
  if (status === "enrolled") return "Enrolled";
  if (status === "heal_no_payment") return "Heal · no payment";
  return "Seek";
}

export function ConsultancyEnrolledUsersList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const data = await adminListEnrolledUsers(adminToken, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
      });
      setRows(data.users);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, pagination.limit, pagination.page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} users`,
    [pagination.page, pagination.pages, pagination.total]
  );

  return (
    <div className="page-card">
      <div className="page-card__head consultancy-page__head">
        <div className="consultancy-page__intro">
          <h2 className="page-card__title">Enrolled users</h2>
          <p className="page-card__desc">Heal users with consultancy payment and assignment details.</p>
        </div>
        <div className="page-card__actions user-list-toolbar consultancy-page__toolbar">
          <div className="user-list-filters consultancy-page__filters">
            <div className="search-field consultancy-page__search">
              <span className="search-field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search enrolled users"
              />
            </div>
          </div>
          <Link to="/admin/consultancy/transactions" className="btn btn--accent">
            Transactions
          </Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Tier</th>
              <th>Referral used</th>
              <th>Health concern</th>
              <th>Assigned coach</th>
              <th>Enrollment</th>
              <th>Latest payment</th>
              <th>Converted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableLoaderRow colSpan={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <p className="table-placeholder">No enrolled users match your search.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user.id}>
                  <td>
                    <div className="data-table__primary">{row.user.name || "—"}</div>
                    <div className="data-table__muted">{row.user.email || "—"}</div>
                  </td>
                  <td>{row.user.userTier || "—"}</td>
                  <td className="data-table__mono">
                    {row.latestTransaction?.referralCodeUsed || row.user.referredByCode || "—"}
                  </td>
                  <td>{healthConcernLabel(row.latestTransaction)}</td>
                  <td>{formatAssignedCoachLabel(row.user)}</td>
                  <td>{enrollmentLabel(row.enrollmentStatus)}</td>
                  <td>
                    {row.latestTransaction ? (
                      <>
                        <div className="data-table__primary">{row.latestTransaction.referenceNumber}</div>
                        <div className="data-table__muted">{row.latestTransaction.paymentStatus}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatDate(row.user.convertedAt)}</td>
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
