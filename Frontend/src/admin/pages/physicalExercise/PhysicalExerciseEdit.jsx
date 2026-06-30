import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetPhysicalExerciseById } from "../../api/adminPhysicalExercise.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { PhysicalExerciseForm } from "./PhysicalExerciseAdd.jsx";

export function PhysicalExerciseEdit() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [exercise, setExercise] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !exerciseId) return;
    let cancelled = false;
    setLoading(true);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load physical exercise." });
        navigate("/admin/physical-exercises");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, exerciseId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit physical exercise" subtitle="Update this physical exercise entry." backTo="/admin/physical-exercises" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading physical exercise..." />
          </div>
        ) : exercise ? (
          <PhysicalExerciseForm mode="edit" initialExercise={exercise} key={exercise._id || exerciseId} />
        ) : null}
      </div>
    </div>
  );
}
