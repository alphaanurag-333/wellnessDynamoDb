import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteTestCatalog,
  adminListTestCatalog,
  adminUpdateTestCatalog,
} from "../../api/adminTestCatalog.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { formatDate, LIST_LIMIT, LIST_SEARCH_MAX_LEN } from "./TestCatalogShared.js";

export function TestCatalogList() {
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
      const { tests, pagination } = await adminListTestCatalog(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(tests);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load tests." });
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
      title: "Delete test?",
      text: `This will delete "${row.name}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteTestCatalog(adminToken, row._id || row.id);
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
    setTogglingId(row._id || row.id);
    try {
      await adminUpdateTestCatalog(adminToken, row._id || row.id, { status: nextStatus });
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
  const subtitle = listCountSubtitle(loading, total, "test", "tests");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Test Catalog"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/test-catalog/new")}>
              Add test
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Name, test ID, category…"
            />
          </label>
          <label className="user-field admin-crud-filters__status">
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="btn btn--ghost admin-crud-filters__clear" onClick={() => { setListSearch(""); setListStatus(""); }}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Test ID</th>
                <th>Type</th>
                <th>Category</th>
                <th>Parameters</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <AdminTableLoaderRow colSpan={8} /> : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-placeholder">
                    No tests found.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? rows.map((row) => (
                    <tr key={row._id || row.id}>
                      <td>{row.name}</td>
                      <td className="data-table__muted">{row.testId}</td>
                      <td>{row.type}</td>
                      <td>{row.category}</td>
                      <td>{Array.isArray(row.parameters) ? row.parameters.length : 0}</td>
                      <td>
                        <button
                          type="button"
                          className="badge-btn"
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === (row._id || row.id)}
                        >
                          <AdminStatusBadge status={row.status} />
                        </button>
                      </td>
                      <td className="data-table__muted">{formatDate(row.updatedAt)}</td>
                      <td>
                        <div className="icon-actions">
                          <Link to={`/admin/test-catalog/${row._id || row.id}`} className="icon-btn icon-btn--view" title="View">
                            <AiOutlineEye />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/admin/test-catalog/${row._id || row.id}/edit`)}
                          >
                            <MdEditSquare />
                          </button>
                          <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                            <AiFillDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <span className="data-table__muted">{pageInfo}</span>
          <div className="pagination-bar__actions">
            <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
