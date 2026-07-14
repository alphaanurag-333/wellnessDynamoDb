import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteContactInquiry,
  adminListContactInquiries,
} from "../../api/contactInquiries.js";
import { AdminListHeader, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import {
  INQUIRY_TYPE_OPTIONS,
  InquiryStatusBadge,
  LIST_LIMIT,
  LIST_SEARCH_MAX_LEN,
  STATUS_FILTER_OPTIONS,
  formatDateTime,
  fullName,
  getContactInquiryId,
  inquiryTypeLabel,
  pillBarStyle,
  pillButtonStyle,
} from "./ContactInquiryShared.jsx";

export function ContactInquiryList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canDelete } = useResourcePermissions("contact-inquiries");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listInquiryType, setListInquiryType] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(listSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { contactInquiries, pagination } = await adminListContactInquiries(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listInquiryType ? { inquiryType: listInquiryType } : {}),
      });
      setRows(contactInquiries);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Load failed",
        text: e.message || "Failed to load contact inquiries.",
      });
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, listInquiryType, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus, listInquiryType]);

  const onDelete = async (row) => {
    const inquiryId = getContactInquiryId(row);
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete inquiry?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !inquiryId) return;
    try {
      await adminDeleteContactInquiry(adminToken, inquiryId);
      await Swal.fire({ icon: "success", title: "Inquiry deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e.message || "Could not delete inquiry.",
      });
    }
  };

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} inquiries`,
    [page, pages, total]
  );
  const subtitle = listCountSubtitle(loading, total, "inquiry", "inquiries");
  const hasFilters = Boolean(listSearch.trim() || listStatus || listInquiryType);

  const clearFilters = () => {
    setListSearch("");
    setListStatus("");
    setListInquiryType("");
  };

  return (
    <div className="user-page contact-inquiry-page">
      <div className="page-card">
        <AdminListHeader title="Contact Inquiries" subtitle={subtitle} />

        <div
          className="contact-inquiry-status-pills"
          style={{
            ...pillBarStyle,
            gridTemplateColumns: `repeat(${STATUS_FILTER_OPTIONS.length}, minmax(0, 1fr))`,
          }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              style={pillButtonStyle(listStatus === opt.value)}
              onClick={() => setListStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="admin-crud-filters contact-inquiry-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Name, email, phone, or message…"
            />
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Inquiry type</span>
            <select
              className="user-field__input"
              value={listInquiryType}
              onChange={(e) => setListInquiryType(e.target.value)}
            >
              <option value="">All types</option>
              {INQUIRY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
          <table className="data-table contact-inquiry-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Received</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={8} label="Loading inquiries..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>No contact inquiries found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const inquiryId = getContactInquiryId(row);
                  return (
                    <tr key={inquiryId || idx}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td className="admin-cell-strong">
                        <Link to={`/admin/contact-inquiries/${inquiryId}`} className="contact-inquiry-name-link">
                          <TableCellText value={fullName(row)} max={28} />
                        </Link>
                      </td>
                      <td className="data-table__muted">
                        {row.email ? (
                          <a href={`mailto:${row.email}`} className="contact-inquiry-email-link">
                            <TableCellText value={row.email} max={32} />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <TableCellText value={inquiryTypeLabel(row.inquiryType)} max={24} />
                      </td>
                      <td className="admin-cell-muted contact-inquiry-table__message">
                        <TableCellText value={row.message} max={40} />
                      </td>
                      <td>
                        <InquiryStatusBadge status={row.status} />
                      </td>
                      <td className="data-table__muted contact-inquiry-table__date">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            to={`/admin/contact-inquiries/${inquiryId}`}
                            className="icon-btn icon-btn--view"
                            title="View"
                          >
                            <AiOutlineEye size={18} />
                          </Link>
                          {canDelete ? (
                            <button
                              type="button"
                              className="icon-btn icon-btn--delete"
                              title="Delete"
                              onClick={() => onDelete(row)}
                            >
                              <AiFillDelete size={18} />
                            </button>
                          ) : null}
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
    </div>
  );
}
