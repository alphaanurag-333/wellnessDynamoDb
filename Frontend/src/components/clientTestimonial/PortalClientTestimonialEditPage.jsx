import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { AdminPageLoader } from "../../admin/components/AdminLoader.jsx";
import { AdminPageHeader } from "../../admin/components/AdminCrud.jsx";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { PortalClientTestimonialForm } from "./PortalClientTestimonialForm.jsx";

export function PortalClientTestimonialEditPage({
  token,
  onUnauthorized,
  basePath,
  getTestimonial,
  updateTestimonial,
}) {
  const { testimonialId } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !testimonialId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const data = await getTestimonial(token, testimonialId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load testimonial." });
        navigate(basePath);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, onUnauthorized, getTestimonial, navigate, testimonialId, basePath]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit client testimonial"
        subtitle="Update rating, description, or public status. Name and photo stay linked to the user."
        backTo={basePath}
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading testimonial..." />
          </div>
        ) : row ? (
          <PortalClientTestimonialForm
            token={token}
            onUnauthorized={onUnauthorized}
            basePath={basePath}
            updateTestimonial={updateTestimonial}
            initialTestimonial={row}
            key={row._id || testimonialId}
          />
        ) : null}
      </div>
    </div>
  );
}
