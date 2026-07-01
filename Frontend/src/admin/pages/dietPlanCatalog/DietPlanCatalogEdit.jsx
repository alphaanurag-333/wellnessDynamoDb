import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetDietPlanCatalogById } from "../../api/adminDietPlanCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { DietPlanForm } from "./DietPlanCatalogAdd.jsx";

export function DietPlanCatalogEdit() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [plan, setPlan] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !planId) return;
    let cancelled = false;
    setLoading(true);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load diet plan." });
        navigate("/admin/diet-plan-catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, planId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit diet plan catalog entry"
        subtitle="Update this diet plan and its meals."
        backTo="/admin/diet-plan-catalog"
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading diet plan..." />
          </div>
        ) : plan ? (
          <DietPlanForm mode="edit" initialPlan={plan} key={plan._id || planId} />
        ) : null}
      </div>
    </div>
  );
}
