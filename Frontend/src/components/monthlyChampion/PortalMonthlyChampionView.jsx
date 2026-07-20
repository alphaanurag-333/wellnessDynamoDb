import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminPageLoadingState } from "../../admin/components/AdminLoader.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../admin/components/AdminCrud.jsx";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { formatDateTime, rankBadge } from "../../admin/pages/monthlyChampion/MonthlyChampionShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function PortalMonthlyChampionView({ token, onUnauthorized, basePath, getChampion }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !postId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    setPost(null);
    (async () => {
      try {
        const data = await getChampion(token, postId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setPost(data);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e.message || "Failed to load post.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, onUnauthorized, getChampion, postId]);

  if (notFound) return <NotFoundPage />;

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(basePath)}>
          Back to list
        </button>
      </div>
    );
  }

  if (!post) return <AdminPageLoadingState label="Loading post…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Monthly champion details"
        subtitle="View this champion post and its comments."
        onBack={() => navigate(-1)}
        actions={
          <button type="button" className="btn btn--ghost" onClick={() => navigate(basePath)}>
            Back to list
          </button>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="User" value={post.user?.name || post.userId} />
          <DetailRow label="Month" value={post.monthYear} />
          <DetailRow label="Title" value={rankBadge(post.rank)} />
          <DetailRow label="Average score" value={`${post.averageScore}%`} />
          <DetailRow label="Days submitted" value={post.daysSubmitted} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={post.status || "active"} />
            </span>
          </div>
          <DetailRow label="Comments" value={post.commentCount ?? 0} />
          <DetailRow label="Notified at" value={formatDateTime(post.notifiedAt)} />
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
                </tr>
              </thead>
              <tbody>
                {(post.comments || []).map((c) => (
                  <tr key={c._id || c.id}>
                    <td>{c.commenter?.name || c.commenterUserId}</td>
                    <td>{c.comment}</td>
                    <td className="data-table__muted">{formatDateTime(c.createdAt)}</td>
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
