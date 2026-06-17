import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetCouponById } from "../../api/adminCoupons.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
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
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Coupon details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit coupon
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={coupon.title} />
          <DetailRow label="Coupon code" value={coupon.couponCode} />
          <DetailRow label="Discount type" value={formatDiscountType(coupon.discountType)} />
          <DetailRow label="Value" value={formatDiscountValue(coupon)} />
          <DetailRow label="Status" value={coupon.status} />
          <DetailRow label="Created" value={formatDate(coupon.createdAt)} />
          <DetailRow label="Updated" value={formatDate(coupon.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
