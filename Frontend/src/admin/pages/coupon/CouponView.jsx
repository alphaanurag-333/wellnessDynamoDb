import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetCouponById } from "../../api/adminCoupons.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate, formatDiscountType, formatDiscountValue } from "./CouponShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function CouponView() {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coupon, setCoupon] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !couponId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetCouponById(adminToken, couponId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setCoupon(row);
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
        setError(e.message || "Failed to load coupon.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, couponId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/coupons")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!coupon) {
    return <AdminPageLoadingState label="Loading coupon…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Coupon details"
        subtitle="View this coupon's details."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit coupon
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={coupon.title} />
          <DetailRow label="Coupon code" value={coupon.couponCode} />
          <DetailRow label="Discount type" value={formatDiscountType(coupon.discountType)} />
          <DetailRow label="Value" value={formatDiscountValue(coupon)} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={coupon.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(coupon.createdAt)} />
          <DetailRow label="Updated" value={formatDate(coupon.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
