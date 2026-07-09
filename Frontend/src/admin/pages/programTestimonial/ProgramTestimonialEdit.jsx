import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetProgramTestimonialById } from "../../api/programTestimonials.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { ProgramTestimonialForm } from "./ProgramTestimonialAdd.jsx";

export function ProgramTestimonialEdit() {
  const { testimonialId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !testimonialId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const data = await adminGetProgramTestimonialById(adminToken, testimonialId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load testimonial." });
        navigate("/admin/program-testimonials");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, testimonialId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit program testimonial"
        subtitle="Update this program testimonial."
        backTo="/admin/program-testimonials"
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading testimonial..." />
          </div>
        ) : row ? (
          <ProgramTestimonialForm mode="edit" initialTestimonial={row} key={row._id || testimonialId} />
        ) : null}
      </div>
    </div>
  );
}
