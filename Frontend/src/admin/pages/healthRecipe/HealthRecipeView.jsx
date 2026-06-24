import { useEffect, useMemo, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetHealthRecipeById } from "../../api/adminHealthRecipes.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, useHealthConcerns, buildConcernTitleMap, healthConcernLabel } from "./HealthRecipeShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function HealthRecipeView() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const healthConcerns = useHealthConcerns(adminToken, dispatch);
  const [recipe, setRecipe] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const concernMap = useMemo(() => buildConcernTitleMap(healthConcerns), [healthConcerns]);

  useEffect(() => {
    if (!adminToken || !recipeId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetHealthRecipeById(adminToken, recipeId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setRecipe(row);
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
        setError(e.message || "Failed to load health recipe.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, recipeId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!recipe) {
    return (
      <AdminPageLoadingState label="Loading health recipe…" />
    );
  }

  const specRows = Array.isArray(recipe.videoSpecification)
    ? recipe.videoSpecification.map((x) => String(x || "").trim()).filter(Boolean)
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
          <h2 className="user-page__title">Health recipe details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit recipe
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={recipe.thumbnail} width={96} height={96} radius={8} alt={recipe.title || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Title" value={recipe.title} />
          <DetailRow label="Health concern" value={healthConcernLabel(recipe, concernMap)} />
          <DetailRow label="Type" value={recipe.type === "video" ? "Video" : recipe.type === "ytlink" ? "YT Link" : recipe.type} />
          <DetailRow label="Status" value={recipe.status} />
          <DetailRow label="Created" value={formatDate(recipe.createdAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>{recipe.type === "video" ? "Video" : "YT Link"}</strong>
          {recipe.type === "ytlink" ? (
            recipe.ytLink ? (
              <div style={{ marginTop: 8 }}>
                <a href={recipe.ytLink} target="_blank" rel="noreferrer">
                  {recipe.ytLink}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : recipe.type === "video" ? (
            recipe.video ? (
              <div style={{ marginTop: 8 }}>
                <video
                  src={mediaUrl(recipe.video)}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxWidth: 560, maxHeight: 320, borderRadius: 8, display: "block" }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{recipe.description || "—"}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Video specifications</strong>
          {specRows.length ? (
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              {specRows.map((spec, index) => (
                <li key={index} style={{ marginBottom: 4 }}>
                  {spec}
                </li>
              ))}
            </ol>
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
