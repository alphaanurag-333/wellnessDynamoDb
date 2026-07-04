import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { IoEyeSharp } from "react-icons/io5";
import {
  adminListAllAssistants,
  adminListWellnessCoaches,
  resolveCoachId,
} from "../../api/adminWellnessCoaches.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { LIST_LIMIT, formatPhone, resolveAssistantId } from "./AssistantShared.js";
import { WellnessCoachTableLoaderRow } from "../wellnessCoach/WellnessCoachPageLoader.jsx";

export function AssistantList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [coachMap, setCoachMap] = useState({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, coachFilter]);

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      try {
        const { wellnessCoaches } = await adminListWellnessCoaches(adminToken, { limit: 200 });
        const map = {};
        for (const c of wellnessCoaches) {
          map[resolveCoachId(c)] = c;
        }
        setCoaches(wellnessCoaches);
        setCoachMap(map);
      } catch (e) {
        if (e?.status === 401) dispatch(logout());
      }
    })();
  }, [adminToken, dispatch]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoadError("");
    setLoading(true);
    try {
      const { assistants, pagination } = await adminListAllAssistants(adminToken, {
        page,
        limit: LIST_LIMIT,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        wellnessCoachId: coachFilter || undefined,
      });
      setRows(assistants);
      setTotal(pagination.total ?? 0);
      setPages(pagination.pages ?? 1);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      setLoadError(e.message || "Failed to load assistants.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, coachFilter, debouncedSearch, dispatch, page, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} assistants`, [page, pages, total]);

  return (
    <div className="page-card">
      <AdminListHeader
        title="Assistant wellness coaches (AWC)"
        subtitle={listCountSubtitle(loading, total, "assistant", "assistants")}
        actions={
          <form
            className="user-list-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setDebouncedSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="search-field">
              <input
                type="search"
                placeholder="Search name, email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="user-list-status-select"
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
              aria-label="Filter by coach"
            >
              <option value="">All coaches</option>
              {coaches.map((c) => (
                <option key={resolveCoachId(c)} value={resolveCoachId(c)}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="user-list-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </form>
        }
      />

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Assistant</th>
              <th>Wellness coach</th>
              <th>Mobile</th>
              <th>Designation</th>
              <th>Status</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <WellnessCoachTableLoaderRow colSpan={7} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className="table-placeholder">No assistants found.</p>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const aid = resolveAssistantId(row);
                const cid = row.wellnessCoachId;
                const coach = coachMap[cid] || row.wellnessCoach;
                return (
                  <tr key={aid}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell__avatar">
                          <AdminMediaImage path={row.profileImage} round width={36} height={36} alt="" />
                        </span>
                        <div>
                          <div className="user-cell__name">{row.name}</div>
                          <div className="user-cell__id data-table__mono">{row.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {coach?.name || row.wellnessCoachName ? (
                        <Link to={`/admin/coaches/${cid}`}>{coach?.name || row.wellnessCoachName}</Link>
                      ) : (
                        <span className="data-table__mono">{cid || "—"}</span>
                      )}
                    </td>
                    <td className="data-table__muted">{formatPhone(row)}</td>
                    <td><TableCellText value={row.designation} /></td>
                    <td>
                      <AdminStatusBadge status={row.status} />
                    </td>
                    <td>
                      {cid ? (
                        <Link
                          to={`/admin/coaches/${cid}/assistants/${aid}`}
                          className="icon-btn icon-btn--view"
                          title="View"
                        >
                          <IoEyeSharp size={18} />
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="user-list-pagination">
          <span className="user-list-pagination__info">{pageInfo}</span>
          <div className="user-list-pagination__btns">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
