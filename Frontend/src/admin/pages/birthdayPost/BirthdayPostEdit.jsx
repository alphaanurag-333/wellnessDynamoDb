import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { IoSendOutline } from "react-icons/io5";
import { adminGetBirthdayPostById, adminUpdateBirthdayPost } from "../../api/birthdayPostController.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { MESSAGE_MAX_LEN } from "./BirthdayPostShared.js";

function BirthdayPostForm({ post }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const postId = post._id || post.id;

  const [message, setMessage] = useState(post.message || "");
  const [status, setStatus] = useState(post.status || "active");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken || saving) return;

    const trimmed = String(message || "").trim();
    if (!trimmed) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Message is required." });
      return;
    }
    if (trimmed.length > MESSAGE_MAX_LEN) {
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        text: `Message cannot exceed ${MESSAGE_MAX_LEN} characters.`,
      });
      return;
    }

    setSaving(true);
    try {
      await adminUpdateBirthdayPost(adminToken, postId, { message: trimmed, status });
      await Swal.fire({ icon: "success", title: "Birthday post updated", timer: 1500 });
      navigate(`/admin/birthday-posts/${postId}`);
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="user-view-grid" style={{ marginBottom: 16 }}>
        <div className="user-detail-row">
          <span className="user-detail-row__label">User</span>
          <span className="user-detail-row__value">{post.user?.name || post.userId || "—"}</span>
        </div>
        <div className="user-detail-row">
          <span className="user-detail-row__label">Post date</span>
          <span className="user-detail-row__value">{post.postDate || "—"}</span>
        </div>
      </div>

      <div className="row g-3">
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Message <span className="required-dot">*</span>
            </span>
            <small>
              {message.length}/{MESSAGE_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={4}
            value={message}
            maxLength={MESSAGE_MAX_LEN}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Birthday message shown on the post"
            required
          />
        </label>

        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate(`/admin/birthday-posts/${postId}`)}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <IoSendOutline size={16} />
          {saving ? "Saving…" : "Update"}
        </button>
      </div>
    </form>
  );
}

export function BirthdayPostEdit() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !postId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const data = await adminGetBirthdayPostById(adminToken, postId);
        if (cancelled) return;
        if (!data?.birthdayPost) {
          setNotFound(true);
          return;
        }
        setPost(data.birthdayPost);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load post." });
        navigate("/admin/birthday-posts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, postId]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Edit birthday post</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/birthday-posts")}>
            Back to list
          </button>
        </div>
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading birthday post..." />
          </div>
        ) : post ? (
          <BirthdayPostForm post={post} key={post._id || postId} />
        ) : null}
      </div>
    </div>
  );
}
