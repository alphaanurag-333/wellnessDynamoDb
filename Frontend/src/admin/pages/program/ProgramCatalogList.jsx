import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteProgramCatalog,
  adminListProgramCatalog,
  adminUpdateProgramCatalog,
} from "../../api/adminProgramCatalog.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  formatDate,
  formatMoney,
  LIST_LIMIT,
  LIST_SEARCH_MAX_LEN,
  PROGRAM_TYPE_OPTIONS,
  programTypeLabel,
} from "./ProgramCatalogShared.js";

export function ProgramCatalogList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { programs, pagination } = await adminListProgramCatalog(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(programs);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load programs." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete program?",
      text: `This will delete "${row.title}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteProgramCatalog(adminToken, row._id || row.id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextActive = !(row.isActive !== false && row.status !== "inactive");
    setTogglingId(row._id || row.id);
    try {
      await adminUpdateProgramCatalog(adminToken, row._id || row.id, { isActive: nextActive });
      await Swal.fire({ icon: "success", title: nextActive ? "Activated" : "Deactivated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "program", "programs");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Wellness Program Catalog"
          subtitle={subtitle}
          actions={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/programs/transactions")}>
                Transactions
              </button>
              <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/programs/new")}>
                Add program
              </button>
            </div>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Title, type, description..."
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
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={() => { setListSearch(""); setListStatus(""); }}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Title</th>
                <th>Type</th>
                <th>Price</th>
                <th>Created</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={7} label="Loading programs..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No programs found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const active = row.isActive !== false && row.status !== "inactive";
                  return (
                    <tr key={row._id || row.id}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td><TableCellText value={row.title} /></td>
                      <td className="data-table__muted">{programTypeLabel(row.programType)}</td>
                      <td>{formatMoney(row.price, row.currency)}</td>
                      <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            className={`settings-switch${active ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={active}
                            onClick={() => onToggleStatus(row)}
                            disabled={togglingId === (row._id || row.id)}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                          <AdminStatusBadge status={active ? "active" : "inactive"} />
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/admin/programs/${row._id || row.id}/edit`)}
                          >
                            <MdEditSquare size={18} />
                          </button>
                          <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                            <AiFillDelete size={18} />
                          </button>
                        </div>
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
