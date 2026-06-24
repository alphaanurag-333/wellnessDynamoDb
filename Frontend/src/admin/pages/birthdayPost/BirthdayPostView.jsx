import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteBirthdayPostComment,
  adminGetBirthdayPostById,
} from "../../api/birthdayPostController.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDateTime } from "./BirthdayPostShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function BirthdayPostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!adminToken || !postId) return;
    try {
      const data = await adminGetBirthdayPostById(adminToken, postId);
      if (!data?.birthdayPost) {
        setNotFound(true);
        return;
      }
      setPost(data.birthdayPost);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      if (e?.status === 404) setNotFound(true);
    }
  };

  useEffect(() => {
    load();
  }, [adminToken, postId]);

  const onDeleteComment = async (comment) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete comment?",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteBirthdayPostComment(adminToken, postId, comment._id);
      await load();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  if (notFound) return <NotFoundPage />;
  if (!post) return <AdminPageLoadingState label="Loading post…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Birthday post details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit post
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="User" value={post.user?.name || post.userId} />
          <DetailRow label="Post date" value={post.postDate} />
          <DetailRow label="Status" value={post.status} />
          <DetailRow label="Comments" value={post.commentCount ?? 0} />
          <DetailRow label="Created" value={formatDateTime(post.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(post.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Message</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{post.message || "—"}</div>
        </div>
      </div>

      <div className="page-card" style={{ marginTop: 16 }}>
        <h3 className="page-card__title">Comments</h3>
        {(post.comments || []).length === 0 ? (
          <p className="data-table__muted">No comments yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Comment</th>
                  <th>Posted</th>
                  <th className="data-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(post.comments || []).map((c) => (
                  <tr key={c._id}>
                    <td>{c.commenter?.name || c.commenterUserId}</td>
                    <td>{c.comment}</td>
                    <td className="data-table__muted">{formatDateTime(c.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn icon-btn--delete"
                        title="Delete"
                        onClick={() => onDeleteComment(c)}
                      >
                        <AiFillDelete size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
