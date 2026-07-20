import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetTransformationById } from "../../api/adminTransformations.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate, IMAGE_HEIGHT, IMAGE_WIDTH } from "./TransformationShared.js";

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
      <AdminPageHeader
        title="Transformation details"
        subtitle="View this transformation record."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit transformation
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="row g-2" style={{ marginBottom: 16 }}>
          <div className="col-6 col-md-6">
            <div className="data-table__muted" style={{ marginBottom: 4 }}>
              Before
            </div>
            <AdminMediaImage
              path={transformation.oldImage}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              radius={8}
              alt="Before"
              objectFit="cover"
              className="admin-media-thumb--transformation"
              style={{ width: IMAGE_WIDTH, maxWidth: "100%", height: IMAGE_HEIGHT, background: "#f1f3f5" }}
            />
          </div>
          <div className="col-6 col-md-6">
            <div className="data-table__muted" style={{ marginBottom: 4 }}>
              After
            </div>
            <AdminMediaImage
              path={transformation.newImage}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              radius={8}
              alt="After"
              objectFit="cover"
              className="admin-media-thumb--transformation"
              style={{ width: IMAGE_WIDTH, maxWidth: "100%", height: IMAGE_HEIGHT, background: "#f1f3f5" }}
            />
          </div>
        </div>
        <div className="user-view-grid">
          <DetailRow label="Time taken (months)" value={transformation.timeTaken != null ? transformation.timeTaken : "—"} />
          <DetailRow
            label="Inches lost"
            value={transformation.inchesLost != null ? transformation.inchesLost : "—"}
          />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={transformation.status} />
            </span>
          </div>
          <DetailRow label="Name" value={transformation.name} />
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
      </div>
    </div>
  );
}
