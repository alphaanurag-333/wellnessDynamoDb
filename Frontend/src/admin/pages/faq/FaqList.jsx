import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { adminDeleteFaq, adminListFaqs, adminUpdateFaq } from "../../api/faqController.js";
import { logout } from "../../../store/authSlice.js";
import {
  ANSWER_PREVIEW_LEN,
  LIST_LIMIT,
  LIST_SEARCH_MAX_LEN,
  QUESTION_PREVIEW_LEN,
  getFaqId,
  truncateText,
} from "./FaqShared.js";

export function FaqList() {
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listStatus, setListStatus] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(listSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { faqs, pagination } = await adminListFaqs(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(faqs);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load FAQs." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus]);

  const onDelete = async (row) => {
    const faqId = getFaqId(row);
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete FAQ?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !faqId) return;
    try {
      await adminDeleteFaq(adminToken, faqId);
      await Swal.fire({ icon: "success", title: "FAQ deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete FAQ." });
    }
  };

  const onToggleStatus = async (row) => {
    const faqId = getFaqId(row);
    if (!adminToken || !faqId) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(faqId);
    try {
      await adminUpdateFaq(adminToken, faqId, { status: nextStatus });
      await Swal.fire({
        icon: "success",
        title: nextStatus === "active" ? "FAQ activated" : "FAQ deactivated",
        timer: 1500,
      });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} FAQs`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">FAQs</h2>
          <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/faq/new")}>
            Add FAQ
          </button>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Question or answer…"
            />
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Question</th>
                <th>Answer</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={5} label="Loading FAQs..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No FAQs found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={getFaqId(row) || idx}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td title={row.question || ""}>{truncateText(row.question, QUESTION_PREVIEW_LEN)}</td>
                    <td title={row.answer || ""}>{truncateText(row.answer, ANSWER_PREVIEW_LEN)}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for FAQ ${idx + 1}`}
                        onClick={() => onToggleStatus(row)}
                        disabled={togglingId === getFaqId(row)}
                        title={row.status === "active" ? "Deactivate FAQ" : "Activate FAQ"}
                      >
                        <span className="settings-switch__knob" aria-hidden />
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/faq/${getFaqId(row)}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/faq/${getFaqId(row)}/edit`)}
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
