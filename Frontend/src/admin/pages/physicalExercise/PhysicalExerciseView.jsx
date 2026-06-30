import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetPhysicalExerciseById } from "../../api/adminPhysicalExercise.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate } from "./PhysicalExerciseShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function PhysicalExerciseView() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [exercise, setExercise] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !exerciseId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetPhysicalExerciseById(adminToken, exerciseId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setExercise(row);
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
        setError(e.message || "Failed to load physical exercise.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, exerciseId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/physical-exercises")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!exercise) {
    return <AdminPageLoadingState label="Loading physical exercise…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Physical exercise details"
        subtitle="View this physical exercise entry."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit physical exercise
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={exercise.title} />
          <DetailRow
            label="Type"
            value={exercise.type === "video" ? "Video" : exercise.type === "ytlink" ? "YT Link" : exercise.type}
          />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={exercise.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(exercise.createdAt)} />
          <DetailRow label="Updated" value={formatDate(exercise.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>{exercise.type === "video" ? "Video" : "YouTube link"}</strong>
          {exercise.link ? (
            exercise.type === "video" ? (
              <div style={{ marginTop: 8 }}>
                <video
                  src={exercise.link}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxWidth: 560, maxHeight: 320, borderRadius: 8, display: "block" }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <a href={exercise.link} target="_blank" rel="noreferrer">
                  {exercise.link}
                </a>
              </div>
            )
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{exercise.description || "—"}</div>
        </div>
      </div>
    </div>
  );
}
