import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetHealthDisorderById } from "../../api/adminHealthDisorders.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate } from "./HealthDisorderShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function HealthDisorderView() {
  const { disorderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [disorder, setDisorder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !disorderId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetHealthDisorderById(adminToken, disorderId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setDisorder(row);
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
        setError(e.message || "Failed to load health disorder.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, disorderId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-disorders")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!disorder) {
    return <AdminPageLoadingState label="Loading health disorder…" />;
  }

  const symptoms = Array.isArray(disorder.symptoms)
    ? disorder.symptoms.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Health disorder details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit disorder
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={disorder.title} />
          <DetailRow label="Type" value={disorder.type === "chronic" ? "Chronic" : disorder.type === "acute" ? "Acute" : disorder.type} />
          <DetailRow label="Status" value={disorder.status} />
          <DetailRow label="Created" value={formatDate(disorder.createdAt)} />
          <DetailRow label="Updated" value={formatDate(disorder.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{disorder.description || "—"}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Symptoms</strong>
          {symptoms.length ? (
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              {symptoms.map((symptom, index) => (
                <li key={index} style={{ marginBottom: 4 }}>
                  {symptom}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
