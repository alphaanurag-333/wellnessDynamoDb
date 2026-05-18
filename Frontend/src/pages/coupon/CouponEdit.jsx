import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetCouponById } from "../../api/adminCoupons.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { CouponForm } from "./CouponAdd.jsx";
import { getCouponId } from "./CouponShared.js";

export function CouponEdit() {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coupon, setCoupon] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !couponId) return;
    let cancelled = false;
    setLoading(true);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load coupon." });
        navigate("/admin/coupons");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, couponId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Edit coupon</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/coupons")}>
            Back to list
          </button>
        </div>
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading coupon..." />
          </div>
        ) : coupon ? (
          <CouponForm mode="edit" initialCoupon={coupon} key={getCouponId(coupon) || couponId} />
        ) : null}
      </div>
    </div>
  );
}
