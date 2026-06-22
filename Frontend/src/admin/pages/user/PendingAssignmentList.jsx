import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminListPendingAssignmentUsers } from "../../api/adminUserAssignment.js";
import { UserAssignCoachModal } from "./UserAssignmentModals.jsx";
import { UserTableLoaderRow } from "./UserPageLoader.jsx";
import { UserTierBadge } from "../../../components/ReferralAssignmentShared.jsx";
import { ConsultancySearchIcon, formatJoined } from "../../../components/consultancy/ConsultancyPortalShared.jsx";
import { logout } from "../../../store/authSlice.js";

export function PendingAssignmentList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [assignUser, setAssignUser] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoadError("");
    setLoading(true);
    try {
      const data = await adminListPendingAssignmentUsers(adminToken, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        userTier: "consultancy_only",
      });
      setRows(data.users);
      setPagination(data.pagination);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      setLoadError(e.message || "Failed to load pending assignments.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, pagination.limit, pagination.page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(
    () => `Page ${pagination.page} of ${pagination.pages} · ${pagination.total} pending`,
    [pagination.page, pagination.pages, pagination.total]
  );

  const countLabel = loading
    ? "Loading…"
    : pagination.total === 1
      ? "1 user awaiting assignment"
      : `${pagination.total} users awaiting assignment`;

  return (
    <div className="page-card heal-users-page">
      <div className="page-card__head consultancy-page__head">
        <div className="consultancy-page__intro">
          <h2 className="page-card__title">Pending manual assignment</h2>
          <p className="page-card__desc">
            Consultancy-paid users without a referral code. Assign a wellness coach or assistant to each
            client below.
          </p>
          {!loading && !loadError ? (
            <p className="data-table__muted">{countLabel}</p>
          ) : null}
        </div>
        <div className="page-card__actions user-list-toolbar consultancy-page__toolbar">
          <div className="user-list-filters consultancy-page__filters">
            <div className="search-field consultancy-page__search">
              <ConsultancySearchIcon />
              <input
                type="search"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search pending assignment users"
              />
            </div>
          </div>
          <Link to="/admin/users" className="btn btn--ghost">
            All users
          </Link>
          <Link to="/admin/consultancy/enrolled-users" className="btn btn--accent">
            Enrolled users
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Consultancy paid</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableLoaderRow colSpan={6} label="Loading pending assignments…" />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <p className="table-placeholder">
                    {debouncedSearch
                      ? "No users match your search."
                      : "No users are pending manual assignment. Everyone who paid with a referral code was auto-assigned, or no consultancy payments have completed yet."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link to={`/admin/users/${user.id}`} className="data-table__primary data-table__link">
                      {user.name || "—"}
                    </Link>
                    <div className="data-table__muted">{user.email || "—"}</div>
                  </td>
                  <td>{[user.phoneCountryCode, user.phone].filter(Boolean).join(" ") || "—"}</td>
                  <td>
                    <UserTierBadge tier={user.userTier} assignmentStatus={user.assignmentStatus} />
                  </td>
                  <td>
                    <span className="tier-badge tier-badge--pending">Pending admin</span>
                  </td>
                  <td>{formatJoined(user.consultancyPaidAt)}</td>
                  <td>
                    <div className="data-table__actions">
                      <Link to={`/admin/users/${user.id}`} className="btn btn--ghost btn--sm">
                        View
                      </Link>
                      <button
                        type="button"
                        className="btn btn--accent btn--sm"
                        onClick={() => setAssignUser(user)}
                      >
                        Assign coach
                      </button>
                    </div>
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

      <UserAssignCoachModal
        open={Boolean(assignUser)}
        user={assignUser}
        mode="assign"
        onClose={() => setAssignUser(null)}
        onSuccess={() => {
          setAssignUser(null);
          load();
        }}
      />
    </div>
  );
}
