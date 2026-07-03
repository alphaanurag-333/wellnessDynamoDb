import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetRealPeopleTestimonialById } from "../../api/realPeopleTestimonials.js";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { RealPeopleTestimonialForm } from "./RealPeopleTestimonialAdd.jsx";

export function RealPeopleTestimonialEdit() {
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
    (async () => {
      try {
        const data = await adminGetRealPeopleTestimonialById(adminToken, testimonialId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) return dispatch(logout());
        if (e?.status === 404) return setNotFound(true);
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
        navigate("/admin/real-people-testimonials");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, testimonialId]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit real people testimonial" backTo="/admin/real-people-testimonials" />
      <div className="page-card">
        {loading ? (
          <AdminPageLoader label="Loading…" />
        ) : row ? (
          <RealPeopleTestimonialForm mode="edit" initial={row} key={row._id} />
        ) : null}
      </div>
    </div>
  );
}
