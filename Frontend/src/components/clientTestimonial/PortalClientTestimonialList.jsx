import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { AdminTableLoaderRow } from "../../admin/components/AdminLoader.jsx";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import {
  AdminListHeader,
  AdminStatusBadge,
  listCountSubtitle,
  TableCellText,
} from "../../admin/components/AdminCrud.jsx";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch.js";
import { mediaUrl } from "../../media.js";
import {
  DESCRIPTION_PREVIEW_LEN,
  LIST_LIMIT,
  sanitizeSingleLine,
  SEARCH_MAX_LEN,
} from "../../admin/pages/clientTestimonial/ClientTestimonialShared.js";

function rowId(row) {
  return row?._id || row?.id || "";
}

export function PortalClientTestimonialList({
  token,
  onUnauthorized,
  basePath,
  listTestimonials,
  updateTestimonial,
  deleteTestimonial,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const { searchInput: listSearch, debouncedSearch, onSearchChange, setSearchInput } = useDebouncedSearch("", {
    maxLength: SEARCH_MAX_LEN,
  });
  const [listStatus, setListStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { clientTestimonials, pagination } = await listTestimonials(token, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setRows(clientTestimonials);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load client testimonials." });
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized, listTestimonials, debouncedSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus]);

  const onDelete = async (row) => {
    const id = rowId(row);
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !token || !id) return;
    try {
      await deleteTestimonial(token, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!token) return;
    const id = rowId(row);
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await updateTestimonial(token, id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} testimonials`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "client testimonial", "client testimonials");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader title="Client testimonials" subtitle={subtitle} actions={null} />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={SEARCH_MAX_LEN}
              onChange={(e) => onSearchChange(sanitizeSingleLine(e.target.value, SEARCH_MAX_LEN))}
              placeholder="Name or description..."
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
                <th>Profile</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Description</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={7} label="Loading testimonials..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No client testimonials found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = rowId(row);
                  return (
                    <tr key={id}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td>
                        <AdminMediaImage
                          path={row.profileImage}
                          src={row.profileImage ? mediaUrl(row.profileImage) : undefined}
                          round
                          width={48}
                          height={48}
                          alt={row.name || "Profile"}
                        />
                      </td>
                      <td>
                        <TableCellText value={row.name} />
                      </td>
                      <td className="data-table__muted">{row.rating ?? "—"}</td>
                      <td className="data-table__muted" title={row.description || ""}>
                        <TableCellText value={row.description} max={DESCRIPTION_PREVIEW_LEN} />
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={row.status === "active"}
                            aria-label={`Toggle status for testimonial ${idx + 1}`}
                            onClick={() => onToggleStatus(row)}
                            disabled={togglingId === id}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                          <AdminStatusBadge status={row.status} />
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`${basePath}/${id}`} className="icon-btn icon-btn--view" title="View">
                            <AiOutlineEye size={18} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`${basePath}/${id}/edit`)}
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
