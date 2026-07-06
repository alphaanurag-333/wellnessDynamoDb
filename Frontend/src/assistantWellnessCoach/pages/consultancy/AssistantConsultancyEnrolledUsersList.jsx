import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { assistantListConsultancyEnrolledUsers } from "../../api/assistantConsultancy.js";
import { logoutAssistant } from "../../../store/authSlice.js";
import { CoachTableLoaderRow } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import {
  ConsultancySearchIcon,
  formatJoined,
  formatMoney,
  healthConcernLabel,
} from "../../../components/consultancy/ConsultancyPortalShared.jsx";

export function AssistantConsultancyEnrolledUsersList() {
  const dispatch = useDispatch();
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
    setLoading(true);
    try {
      const data = await assistantListConsultancyEnrolledUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
      });
      setRows(data.users);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutAssistant());
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dispatch, pagination.limit, pagination.page]);

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
          <p className="page-card__desc">Clients who paid for consultancy and are linked to your assignments.</p>
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
          </div>
          <Link to="/assistant/consultancy/transactions" className="btn btn--accent">
            Transactions
          </Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table consultancy-users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Referral used</th>
              <th>Health concern</th>
              <th>Latest payment</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={6} label="Loading enrolled users…" />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <p className="table-placeholder">No consultancy enrolled users assigned to you yet.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user.id}>
                  <td>
                    <div className="data-table__primary">{row.user.name || "—"}</div>
                    <div className="data-table__muted">{row.user.email || "—"}</div>
                  </td>
                  <td>{[row.user.phoneCountryCode, row.user.phone].filter(Boolean).join(" ") || "—"}</td>
                  <td className="data-table__mono">{row.latestTransaction?.referralCodeUsed || "—"}</td>
                  <td>{healthConcernLabel(row.latestTransaction)}</td>
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
