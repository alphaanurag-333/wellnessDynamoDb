import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetDietPlanCatalogById } from "../../api/adminDietPlanCatalog.js";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, slotLabel, typeLabel } from "./DietPlanCatalogShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function DietPlanCatalogView() {
  const { planId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [plan, setPlan] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !planId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetDietPlanCatalogById(adminToken, planId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setPlan(row);
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
        setError(e.message || "Failed to load diet plan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, planId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/diet-plan-catalog")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!plan) {
    return <AdminPageLoadingState label="Loading diet plan…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Diet plan catalog details"
        subtitle={plan.name}
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit diet plan
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Name" value={plan.name} />
          <DetailRow label="Plan ID" value={plan.planId} />
          <DetailRow label="Type" value={typeLabel(plan.type)} />
          <DetailRow label="Category" value={plan.category} />
          <DetailRow label="Sequence" value={plan.sequence ?? 0} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={plan.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(plan.createdAt)} />
          <DetailRow label="Updated" value={formatDate(plan.updatedAt)} />
        </div>

        {plan.description ? (
          <div style={{ marginTop: 16 }}>
            <h3 className="form-card__title" style={{ margin: 0 }}>
              Description
            </h3>
            <p className="data-table__muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {plan.description}
            </p>
          </div>
        ) : null}

        <h3 className="form-card__title" style={{ marginTop: 24 }}>
          Meals ({Array.isArray(plan.meals) ? plan.meals.length : 0})
        </h3>
        <div className="table-scroll" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Title</th>
                <th>Meal ID</th>
                <th>Day</th>
                <th>Slot</th>
                <th>Foods</th>
                <th>Calories</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(plan.meals || []).length === 0 ? (
                <tr>
                  <td colSpan={8}>No meals.</td>
                </tr>
              ) : (
                (plan.meals || []).map((m, idx) => (
                  <tr key={m.mealId || m.title || idx}>
                    <td className="data-table__muted">{idx + 1}</td>
                    <td>{m.title || "—"}</td>
                    <td className="data-table__muted">{m.mealId || "—"}</td>
                    <td>{m.day || "—"}</td>
                    <td>{slotLabel(m.slot)}</td>
                    <td>{m.foods || "—"}</td>
                    <td className="data-table__muted">{m.calories != null ? m.calories : "—"}</td>
                    <td>{m.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
