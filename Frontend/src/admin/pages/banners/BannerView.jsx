import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminDeleteBanner, adminGetBannerById } from "../../api/bannerController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminDetailBannerImage } from "../../components/AdminDetailBannerImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { formatDate, bannerTypeLabel, BANNER_TYPE_WELLNESSPEDIA } from "./BannerShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function BannerView() {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canDelete } = useResourcePermissions("banners");
  const [banner, setBanner] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!adminToken || !bannerId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetBannerById(adminToken, bannerId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setBanner(row);
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
        setError(e.message || "Failed to load banner.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, bannerId]);

  const onDelete = async () => {
    if (!banner || !adminToken) return;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete banner?",
      html: `Are you sure you want to delete <strong>${String(banner.title || "this banner")}</strong>?<br/><span style="color:#6b7280">This action cannot be undone.</span>`,
      showCancelButton: true,
      focusCancel: true,
      reverseButtons: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      allowOutsideClick: false,
    });
    if (!isConfirmed) return;

    setDeleting(true);
    try {
      await adminDeleteBanner(adminToken, banner._id || banner.id || bannerId);
      await Swal.fire({ icon: "success", title: "Banner deleted", timer: 1500, showConfirmButton: false });
      navigate("/admin/banners");
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete banner." });
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/banners")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!banner) {
    return <AdminPageLoadingState label="Loading banner…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Banner details"
        subtitle="View this banner."
        onBack={() => navigate(-1)}
        actions={
          <>
            <Link to="edit" className="btn btn--primary user-page__edit-link">
              Edit banner
            </Link>
            {canDelete ? (
              <button type="button" className="btn btn--danger" onClick={onDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </>
        }
      />

      <div className="page-card user-view-card">
        {banner.bannerType !== BANNER_TYPE_WELLNESSPEDIA && banner.image ? (
          <>
            <div className="user-detail-row" style={{ marginBottom: 8 }}>
              <span className="user-detail-row__label">Desktop banner</span>
            </div>
            <AdminDetailBannerImage path={banner.image} alt={banner.title || "Desktop banner"} />
          </>
        ) : null}
        {banner.mobileImage ? (
          <>
            <div
              className="user-detail-row"
              style={{
                marginTop: banner.bannerType !== BANNER_TYPE_WELLNESSPEDIA && banner.image ? 20 : 0,
                marginBottom: 8,
              }}
            >
              <span className="user-detail-row__label">
                {banner.bannerType === BANNER_TYPE_WELLNESSPEDIA ? "Banner image" : "Mobile / app banner"}
              </span>
            </div>
            <AdminDetailBannerImage
              path={banner.mobileImage}
              alt={`${banner.title || "Banner"} (mobile)`}
              aspectRatio="1080 / 480"
              maxHeight={360}
              objectFit="contain"
            />
          </>
        ) : null}
        <div className="user-view-grid">
          <DetailRow label="Title" value={banner.title} />
          <DetailRow label="Banner type" value={bannerTypeLabel(banner.bannerType)} />
          <div className="user-detail-row user-detail-row--stack">
            <span className="user-detail-row__label">Description</span>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{banner.description || "—"}</div>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={banner.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(banner.createdAt)} />
          <DetailRow label="Updated" value={formatDate(banner.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
