import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AiFillDelete } from "react-icons/ai";
import { IoEyeSharp } from "react-icons/io5";
import { MdEditSquare } from "react-icons/md";
import {
  adminDeleteCoachAssistant,
  adminListCoachAssistants,
  adminUpdateCoachAssistant,
} from "../../api/adminWellnessCoaches.js";
import { AdminListHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { logout } from "../../../store/authSlice.js";
import { selectAdmin, selectIsCoachAccount } from "../../../store/authSelectors.js";
import { LIST_LIMIT, formatPhone, resolveAssistantId } from "../assistantWellnessCoach/AssistantShared.js";
import { WellnessCoachTableLoaderRow } from "../wellnessCoach/WellnessCoachPageLoader.jsx";

export function MyAssistantsList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((state) => state.auth.adminToken);
  const admin = useSelector(selectAdmin);
  const isCoach = useSelector(selectIsCoachAccount);
  const { canEdit, canDelete } = useResourcePermissions("my-assistants");
  const coachId = String(admin?.id || admin?._id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!adminToken || !coachId || !isCoach) return;
    setLoading(true);
    setError("");
    try {
      const result = await adminListCoachAssistants(adminToken, coachId, {
        page,
        limit: LIST_LIMIT,
        search: search || undefined,
        status: status || undefined,
      });
      setRows(result.assistants);
      setPages(result.pagination.pages ?? 1);
      setTotal(result.pagination.total ?? 0);
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else setError(err.message || "Failed to load assistants.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, coachId, dispatch, isCoach, page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (assistant) => {
    const id = resolveAssistantId(assistant);
    const { isConfirmed } = await Swal.fire({
      title: "Delete assistant?",
      text: assistant.name || assistant.email,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await adminDeleteCoachAssistant(adminToken, coachId, id);
      await Swal.fire({ icon: "success", title: "Assistant deleted", timer: 1500 });
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Delete failed", text: err.message });
    }
  };

  const toggleStatus = async (assistant) => {
    const id = resolveAssistantId(assistant);
    try {
      await adminUpdateCoachAssistant(adminToken, coachId, id, {
        status: assistant.status === "active" ? "inactive" : "active",
      });
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Update failed", text: err.message });
    }
  };

  if (!isCoach) return <p className="table-placeholder">This section is available to wellness coaches only.</p>;

  return (
    <div className="page-card">
      <AdminListHeader
        title="My assistants"
        subtitle={loading ? "Loading assistants…" : `${total} assistant${total === 1 ? "" : "s"}`}
        actions={
          <>
            <form className="user-list-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); load(); }}>
              <div className="search-field">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assistants…" />
              </div>
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="user-list-status-select">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </form>
            {canEdit ? <Link to="new" className="btn btn--accent">+ Add assistant</Link> : null}
          </>
        }
      />
      {error ? <p className="user-list-error">{error}</p> : null}
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>S.No</th><th>Assistant</th><th>Mobile</th><th>Designation</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <WellnessCoachTableLoaderRow colSpan={6} /> : rows.length === 0 ? (
              <tr><td colSpan={6}><p className="table-placeholder">No assistants found.</p></td></tr>
            ) : rows.map((assistant, index) => {
              const id = resolveAssistantId(assistant);
              return (
                <tr key={id}>
                  <td>{(page - 1) * LIST_LIMIT + index + 1}</td>
                  <td><div className="user-cell"><AdminMediaImage path={assistant.profileImage} round width={36} height={36} alt="" /><div><div className="user-cell__name">{assistant.name}</div><div className="user-cell__id">{assistant.email}</div></div></div></td>
                  <td>{formatPhone(assistant)}</td>
                  <td>{assistant.designation || "—"}</td>
                  <td>{canEdit ? <button type="button" className={`settings-switch${assistant.status === "active" ? " settings-switch--on" : ""}`} onClick={() => toggleStatus(assistant)}><span className="settings-switch__knob" /></button> : <AdminStatusBadge status={assistant.status} />}</td>
                  <td><div className="row-actions">
                    <Link to={id} className="icon-btn icon-btn--view" title="View"><IoEyeSharp size={18} /></Link>
                    {canEdit ? <Link to={`${id}/edit`} className="icon-btn icon-btn--edit" title="Edit"><MdEditSquare size={18} /></Link> : null}
                    {canDelete ? <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => handleDelete(assistant)}><AiFillDelete size={18} /></button> : null}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 ? <div className="user-list-pagination"><span>Page {page} of {pages}</span><div><button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}
    </div>
  );
}
