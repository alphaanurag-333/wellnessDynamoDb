import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetLeadershipNoteById } from "../../api/leadershipNotesController.js";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDateTime } from "./LeadershipNoteShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function LeadershipNoteView() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !noteId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const data = await adminGetLeadershipNoteById(adminToken, noteId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load note." });
        navigate("/admin/leadership-notes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, noteId]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Leadership note"
        subtitle="View leadership message details."
        backTo="/admin/leadership-notes"
        actions={
          row ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate(`/admin/leadership-notes/${row._id || row.id}/edit`)}
            >
              Edit
            </button>
          ) : null
        }
      />
      <div className="page-card user-view-card">
        {loading ? (
          <AdminPageLoader label="Loading note..." />
        ) : row ? (
          <div className="user-view-grid">
            <div className="user-detail-row">
              <span className="user-detail-row__label">Profile</span>
              <span className="user-detail-row__value">
                <AdminMediaImage path={row.profileImage} round width={72} height={72} alt={row.name || "Profile"} />
              </span>
            </div>
            <DetailRow label="Name" value={row.name} />
            <DetailRow label="Designation" value={row.designation} />
            <DetailRow label="Title" value={row.title} />
            <DetailRow label="Badge" value={row.badge} />
            <div className="user-detail-row">
              <span className="user-detail-row__label">Status</span>
              <span className="user-detail-row__value">
                <AdminStatusBadge status={row.status} />
              </span>
            </div>
            <div className="user-detail-row" style={{ gridColumn: "1 / -1" }}>
              <span className="user-detail-row__label">Message</span>
              <span className="user-detail-row__value" style={{ whiteSpace: "pre-wrap" }}>
                {row.message || "—"}
              </span>
            </div>
            <DetailRow label="Created" value={formatDateTime(row.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(row.updatedAt)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
