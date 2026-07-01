import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { coachListConsultancyEnrolledUsers } from "../../api/coachConsultancy.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachTableLoaderRow } from "../../components/CoachPageLoader.jsx";
import {
  assigneeLabel,
  ConsultancySearchIcon,
  formatJoined,
  formatMoney,
  healthConcernLabel,
} from "../../../components/consultancy/ConsultancyPortalShared.jsx";

export function CoachConsultancyEnrolledUsersList() {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, scope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coachListConsultancyEnrolledUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        scope,
      });
      setRows(data.users);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dispatch, pagination.limit, pagination.page, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} users`,
    [pagination.page, pagination.pages, pagination.total]
  );

  return (
    <div className="page-card heal-users-page">
      <div className="page-card__head consultancy-page__head">
        <div className="consultancy-page__intro">
          <h2 className="page-card__title">Consultancy enrolled users</h2>
          {/* <p className="page-card__desc">
            Clients who completed consultancy payment and are linked to you or your assistants.
          </p> */}
        </div>
        <div className="page-card__actions user-list-toolbar consultancy-page__toolbar">
          <div className="user-list-filters consultancy-page__filters">
            <div className="search-field consultancy-page__search">
              <ConsultancySearchIcon />
              <input
                type="search"
                placeholder="Search name, email, reference"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search enrolled users"
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
          </div>
          <Link to="/coach/consultancy/transactions" className="btn btn--accent">
            Transactions
          </Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Referral used</th>
              <th>Health concern</th>
              <th>Meeting with</th>
              <th>Latest payment</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={7} label="Loading enrolled users…" />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className="table-placeholder">No consultancy enrolled users linked to your account yet.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user.id}>
                  <td>
                    <Link to={`/coach/consultancy/clients/${row.user.id}`} className="data-table__primary data-table__link">
                      {row.user.name || "—"}
                    </Link>
                    <div className="data-table__muted">{row.user.email || "—"}</div>
                  </td>
                  <td>{[row.user.phoneCountryCode, row.user.phone].filter(Boolean).join(" ") || "—"}</td>
                  <td className="data-table__mono">{row.latestTransaction?.referralCodeUsed || "—"}</td>
                  <td>{healthConcernLabel(row.latestTransaction)}</td>
                  <td>{assigneeLabel(row.latestTransaction)}</td>
                  <td>
                    <div className="data-table__primary">{row.latestTransaction?.referenceNumber || "—"}</div>
                    <div className="data-table__muted">{formatMoney(row.latestTransaction?.totalAmount)}</div>
                  </td>
                  <td>{formatJoined(row.latestTransaction?.paidAt)}</td>
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
