import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiOutlineEye } from "react-icons/ai";
import { adminListBirthdayPosts } from "../../api/birthdayPostController.js";
import { logout } from "../../../store/authSlice.js";
import {
  LIST_LIMIT,
  STATUS_OPTIONS,
  pillBarStyle,
  pillButtonStyle,
} from "./BirthdayPostShared.js";

export function BirthdayPostList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listStatus, setListStatus] = useState("");
  const [listDate, setListDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { birthdayPosts, pagination } = await adminListBirthdayPosts(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(listDate ? { postDate: listDate } : {}),
      });
      setRows(birthdayPosts);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listDate, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listStatus, listDate]);

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} birthday post${total === 1 ? "" : "s"}`,
    [page, pages, total]
  );

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Birthday posts</h2>
        </div>

        <div
          style={{
            ...pillBarStyle,
            gridTemplateColumns: `repeat(${STATUS_OPTIONS.length}, minmax(0, 1fr))`,
            marginBottom: 10,
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
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

        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "0 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Post date</span>
            <input
              type="date"
              className="user-field__input"
              value={listDate}
              onChange={(e) => setListDate(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Comments</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={6} label="Loading birthday posts..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No birthday posts found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>{row.user?.name || row.userId}</td>
                    <td className="data-table__muted">{row.postDate}</td>
                    <td>{row.status}</td>
                    <td className="data-table__muted">{row.commentCount ?? 0}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--view"
                          title="View"
                          onClick={() => navigate(`/admin/birthday-posts/${row._id}`)}
                        >
                          <AiOutlineEye size={18} />
                        </button>
                        <Link
                          to={`/admin/birthday-posts/${row._id}/edit`}
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                        >
                          <MdEditSquare size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 || total > 0 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            {pages > 1 ? (
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
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
