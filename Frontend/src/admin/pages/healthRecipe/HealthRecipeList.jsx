import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { adminDeleteHealthRecipe, adminListHealthRecipes, adminUpdateHealthRecipe } from "../../api/adminHealthRecipes.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { mediaUrl } from "../../../media.js";
import { formatDate, LIST_LIMIT, LIST_SEARCH_MAX_LEN, useHealthConcerns, buildConcernTitleMap, healthConcernLabel } from "./HealthRecipeShared.js";

export function HealthRecipeList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const healthConcerns = useHealthConcerns(adminToken, dispatch);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listType, setListType] = useState("");
  const [listConcern, setListConcern] = useState("");
  const concernMap = useMemo(() => buildConcernTitleMap(healthConcerns), [healthConcerns]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { healthRecipes, pagination } = await adminListHealthRecipes(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listType ? { type: listType } : {}),
        ...(listConcern ? { healthConcernId: listConcern } : {}),
      });
      setRows(healthRecipes);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health recipes." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listConcern, listSearch, listStatus, listType, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus, listType, listConcern]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete health recipe?",
      text: `This will delete "${row.title}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteHealthRecipe(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateHealthRecipe(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: nextStatus === "active" ? "Activated" : "Deactivated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "health recipe", "health recipes");
  const hasFilters = Boolean(listSearch.trim() || listStatus || listType || listConcern);

  const clearFilters = () => {
    setListSearch("");
    setListStatus("");
    setListType("");
    setListConcern("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Health recipes"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/health-recipes/new")}>
              Add health recipe
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Title or description..."
              maxLength={LIST_SEARCH_MAX_LEN}
            />
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Type</span>
            <select className="user-field__input" value={listType} onChange={(e) => setListType(e.target.value)}>
              <option value="">All</option>
              <option value="ytlink">YT Link</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Health concern</span>
            <select className="user-field__input" value={listConcern} onChange={(e) => setListConcern(e.target.value)}>
              <option value="">All</option>
              {healthConcerns.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.title || c.id || c._id}
                </option>
              ))}
            </select>
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
                <th>S No.</th>
                <th>Thumbnail</th>
                <th>Title</th>
                <th>Concern</th>
                <th>Type</th>
                <th>YT Link</th>
                <th>Video</th>
                <th>Specs</th>
                <th>Created</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={11} label="Loading health recipes..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11}>No health recipes found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      {row.thumbnail ? (
                        <AdminMediaImage path={row.thumbnail} width={44} height={44} radius={8} alt="" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td><TableCellText value={row.title} /></td>
                    <td className="data-table__muted">{healthConcernLabel(row, concernMap)}</td>
                    <td className="data-table__muted">{row.type || "—"}</td>
                    <td>
                      {row.type === "ytlink" ? (
                        row.ytLink ? (
                          <a href={row.ytLink} target="_blank" rel="noreferrer" title={row.ytLink}>
                            Open link
                          </a>
                        ) : (
                          "—"
                        )
                      ) : (
                        <span className="data-table__muted">N/A</span>
                      )}
                    </td>
                    <td>
                      {row.type === "video" ? (
                        row.video ? (
                          <video
                            src={mediaUrl(row.video)}
                            controls
                            preload="metadata"
                            playsInline
                            style={{ width: 160, maxWidth: "100%", height: 90, objectFit: "cover", borderRadius: 6, display: "block" }}
                          />
                        ) : (
                          "—"
                        )
                      ) : (
                        <span className="data-table__muted">N/A</span>
                      )}
                    </td>
                    <td className="data-table__muted">{Array.isArray(row.videoSpecification) ? row.videoSpecification.length : 0}</td>
                    <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          type="button"
                          className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={row.status === "active"}
                          aria-label={`Toggle status for ${row.title}`}
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === row._id}
                          title={row.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/health-recipes/${row._id}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/health-recipes/${row._id}/edit`)}
                        >
                          <MdEditSquare size={18} />
                        </button>
                        <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                          <AiFillDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            <div className="user-list-pagination__btns">
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


