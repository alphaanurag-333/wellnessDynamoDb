import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { FadeLoader } from "react-spinners";
import { adminDeleteHealthRecipe, adminListHealthRecipes, adminUpdateHealthRecipe } from "../../api/adminHealthRecipes.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import { formatDate, LIST_LIMIT, LIST_SEARCH_MAX_LEN, truncate, useHealthConcerns } from "./HealthRecipeShared.js";

export function HealthRecipeManagePage() {
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
  const [viewRow, setViewRow] = useState(null);
  const concernMap = useMemo(() => Object.fromEntries(healthConcerns.map((x) => [x._id, x.title || ""])), [healthConcerns]);

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

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Health recipes</h2>
          <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/health-recipes/new")}>Add health recipe</button>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <label className="user-field" style={{ flex: "1 1 220px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input className="user-field__input" value={listSearch} onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))} placeholder="Title or description..." maxLength={LIST_SEARCH_MAX_LEN} />
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Type</span>
            <select className="user-field__input" value={listType} onChange={(e) => setListType(e.target.value)}>
              <option value="">All</option><option value="ytlink">YT Link</option><option value="video">Video</option>
            </select>
          </label>
          <label className="user-field" style={{ flex: "1 1 220px", marginBottom: 0 }}>
            <span className="user-field__label">Health concern</span>
            <select className="user-field__input" value={listConcern} onChange={(e) => setListConcern(e.target.value)}>
              <option value="">All</option>
              {healthConcerns.map((c) => <option key={c._id} value={c._id}>{c.title || c._id}</option>)}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>S No.</th><th>Thumbnail</th><th>Title</th><th>Concern</th><th>Type</th><th>YT Link</th><th>Video</th><th>Specs</th><th>Created</th><th>Status</th><th className="data-table__actions-col">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="static-cms-loading"><div style={{ display: "grid", justifyItems: "center", gap: 10 }}><FadeLoader height={12} margin={-1} radius={20} width={4} color="#4f46e5" /><span>Loading health recipes...</span></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11}>No health recipes found.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={row._id}>
                  <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                  <td>{row.thumbnail ? <img src={mediaUrl(row.thumbnail)} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} /> : "—"}</td>
                  <td>{row.title || "—"}</td>
                  <td className="data-table__muted">{concernMap[row.healthConcernId] || row.healthConcernId || "—"}</td>
                  <td className="data-table__muted">{row.type || "—"}</td>
                  <td className="data-table__muted" title={row.ytLink || ""}>{truncate(row.ytLink, 30)}</td>
                  <td className="data-table__muted" title={row.video || ""}>{truncate(row.video, 30)}</td>
                  <td className="data-table__muted">{Array.isArray(row.video_specification) ? row.video_specification.length : 0}</td>
                  <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                  <td><button type="button" className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`} role="switch" aria-checked={row.status === "active"} aria-label={`Toggle status for ${row.title}`} onClick={() => onToggleStatus(row)} disabled={togglingId === row._id} title={row.status === "active" ? "Deactivate" : "Activate"}><span className="settings-switch__knob" aria-hidden /></button></td>
                  <td><div className="row-actions"><button type="button" className="icon-btn icon-btn--view" title="View" onClick={() => setViewRow(row)}><AiOutlineEye size={18} /></button><button type="button" className="icon-btn icon-btn--edit" title="Edit" onClick={() => navigate(`/admin/health-recipes/${row._id}/edit`)}><MdEditSquare size={18} /></button><button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}><AiFillDelete size={18} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 ? <div className="user-list-pagination"><span className="user-list-pagination__info">{pageInfo}</span><div className="user-list-pagination__btns"><button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button></div></div> : null}
      </div>
      {viewRow ? (
        <div role="dialog" aria-modal="true" onClick={() => setViewRow(null)} style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div className="page-card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="page-card__head" style={{ marginBottom: 12 }}><h2 className="page-card__title">Health recipe</h2><button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>Close</button></div>
            {viewRow.thumbnail ? <div style={{ marginBottom: 12 }}><img src={mediaUrl(viewRow.thumbnail)} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} /></div> : null}
            <div className="row g-2">
              <div className="col-12"><strong>Title:</strong> {viewRow.title || "—"}</div>
              <div className="col-12"><strong>Health concern:</strong> {concernMap[viewRow.healthConcernId] || viewRow.healthConcernId || "—"}</div>
              <div className="col-12"><strong>Description:</strong><div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{viewRow.description || "—"}</div></div>
              <div className="col-6"><strong>Type:</strong> {viewRow.type || "—"}</div>
              <div className="col-6"><strong>Status:</strong> {viewRow.status || "—"}</div>
              <div className="col-12"><strong>YT Link:</strong> {viewRow.ytLink || "—"}</div>
              <div className="col-12"><strong>Video:</strong> {viewRow.video || "—"}</div>
              <div className="col-12"><strong>Video specification:</strong><div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{Array.isArray(viewRow.video_specification) && viewRow.video_specification.length ? viewRow.video_specification.join("\n") : "—"}</div></div>
              <div className="col-6"><strong>Created:</strong> {formatDate(viewRow.createdAt)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
