import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetSpecializationById } from "../../api/adminSpecializations.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate } from "./SpecializationShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function SpecializationView() {
  const { specializationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [specialization, setSpecialization] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !specializationId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetSpecializationById(adminToken, specializationId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setSpecialization(row);
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
        setError(e.message || "Failed to load specialization.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, specializationId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/specializations")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!specialization) {
    return <AdminPageLoadingState label="Loading specialization…" />;
  }

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Specialization details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit specialization
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Status" value={specialization.status} />
          <DetailRow label="Created" value={formatDate(specialization.createdAt)} />
          <DetailRow label="Updated" value={formatDate(specialization.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Title</strong>
          <div style={{ marginTop: 6, overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {specialization.title || "—"}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div
            style={{ marginTop: 6, overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
          >
            {specialization.description || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
