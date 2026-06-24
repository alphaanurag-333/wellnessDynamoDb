import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetTransformationById } from "../../api/adminTransformations.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, userLabel } from "./TransformationShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function TransformationView() {
  const { transformationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [transformation, setTransformation] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !transformationId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetTransformationById(adminToken, transformationId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setTransformation(row);
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
        setError(e.message || "Failed to load transformation.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, transformationId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/transformations")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!transformation) {
    return <AdminPageLoadingState label="Loading transformation…" />;
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
          <h2 className="user-page__title">Transformation details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit transformation
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="row g-2" style={{ marginBottom: 16 }}>
          <div className="col-6 col-md-6">
            <div className="data-table__muted" style={{ marginBottom: 4 }}>
              Before
            </div>
            <AdminMediaImage
              path={transformation.oldImage}
              width={240}
              height={200}
              radius={8}
              alt="Before"
              style={{ width: "100%", maxHeight: 200 }}
            />
          </div>
          <div className="col-6 col-md-6">
            <div className="data-table__muted" style={{ marginBottom: 4 }}>
              After
            </div>
            <AdminMediaImage
              path={transformation.newImage}
              width={240}
              height={200}
              radius={8}
              alt="After"
              style={{ width: "100%", maxHeight: 200 }}
            />
          </div>
        </div>
        <div className="user-view-grid">
          <DetailRow label="Time taken (months)" value={transformation.timeTaken != null ? transformation.timeTaken : "—"} />
          <DetailRow label="Status" value={transformation.status} />
          <DetailRow label="User" value={userLabel(transformation)} />
          <DetailRow label="Created" value={formatDate(transformation.createdAt)} />
          <DetailRow label="Updated" value={formatDate(transformation.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Achievements</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{transformation.achievements || "—"}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{transformation.description || "—"}</div>
        </div>
        {transformation.userId && typeof transformation.userId === "object" && transformation.userId.email ? (
          <p className="data-table__muted" style={{ marginTop: 12 }}>
            User email: {transformation.userId.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}
