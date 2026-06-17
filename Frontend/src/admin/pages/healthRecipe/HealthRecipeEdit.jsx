import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetHealthRecipeById } from "../../api/adminHealthRecipes.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { HealthRecipeForm } from "./HealthRecipeAdd.jsx";

export function HealthRecipeEdit() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [recipe, setRecipe] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !recipeId) return;
    let cancelled = false;
    setLoading(true);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health recipe." });
        navigate("/admin/health-recipes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, recipeId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Edit health recipe</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>
            Back to list
          </button>
        </div>
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading health recipe..." />
          </div>
        ) : recipe ? (
          <HealthRecipeForm mode="edit" initialRecipe={recipe} key={recipe._id || recipeId} />
        ) : null}
      </div>
    </div>
  );
}
