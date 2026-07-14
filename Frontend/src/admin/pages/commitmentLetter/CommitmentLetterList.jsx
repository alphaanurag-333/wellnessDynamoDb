import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteCommitmentLetter,
  adminListCommitmentLetters,
  adminReviewCommitmentLetter,
} from "../../api/commitmentLetters.js";
import { AdminListHeader, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import {
  approvalBadgeClass,
  approvalLabel,
  formatDateTime,
  LIST_LIMIT,
} from "./CommitmentLetterShared.js";

export function CommitmentLetterList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canEdit, canDelete } = useResourcePermissions("commitment-letters");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listApproval, setListApproval] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { commitmentLetters, pagination } = await adminListCommitmentLetters(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listApproval ? { approvalStatus: listApproval } : {}),
      });
      setRows(commitmentLetters);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load commitment letters." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listApproval, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listApproval]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete commitment letter?",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteCommitmentLetter(adminToken, row._id || row.id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  const onReview = async (row, action) => {
    if (!adminToken) return;
    let rejectionReason = "";
    if (action === "rejected") {
      const result = await Swal.fire({
        title: "Rejection reason",
        input: "textarea",
        inputPlaceholder: "Explain what the user should fix…",
        inputValidator: (value) => {
          if (!String(value || "").trim()) return "Rejection reason is required";
          return undefined;
        },
        showCancelButton: true,
      });
      if (!result.isConfirmed) return;
      rejectionReason = String(result.value || "").trim();
    } else {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: "Approve commitment letter?",
        showCancelButton: true,
        confirmButtonText: "Approve",
      });
      if (!isConfirmed) return;
    }
    try {
      await adminReviewCommitmentLetter(adminToken, row._id || row.id, { action, rejectionReason });
      await Swal.fire({ icon: "success", title: action === "approved" ? "Approved" : "Rejected", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "letter", "letters");
  const hasFilters = Boolean(listApproval);

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader title="Commitment letters" subtitle={subtitle} />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Approval</span>
            <select className="user-field__input" value={listApproval} onChange={(e) => setListApproval(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={() => setListApproval("")}>
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Approval</th>
                <th>Submitted</th>
                <th>Resubmissions</th>
                <th>PDF</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={9} label="Loading commitment letters…" />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No commitment letters found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id || row.id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <AdminMediaImage
                        path={row.userAvatar || row.profileImage}
                        round
                        width={40}
                        height={40}
                        alt={row.userName || "Profile"}
                      />
                    </td>
                    <td><TableCellText value={row.userName} /></td>
                    <td className="data-table__muted"><TableCellText value={row.userEmail || row.user?.email} /></td>
                    <td>
                      <span className={approvalBadgeClass(row.approvalStatus)}>{approvalLabel(row.approvalStatus)}</span>
                      {row.approvalStatus === "rejected" && row.rejectionReason ? (
                        <div className="data-table__muted" style={{ marginTop: 4, maxWidth: 220 }}>
                          {row.rejectionReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="data-table__muted">{formatDateTime(row.createdAt)}</td>
                    <td>{Number(row.resubmissionCount) || 0}</td>
                    <td>
                      {row.pdfUrl ? (
                        <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                          View PDF
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {canEdit && row.approvalStatus === "pending" ? (
                          <>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(row, "approved")}>
                              Approve
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(row, "rejected")}>
                              Reject
                            </button>
                          </>
                        ) : null}
                        {canDelete ? (
                          <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                            <AiFillDelete size={18} />
                          </button>
                        ) : null}
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
