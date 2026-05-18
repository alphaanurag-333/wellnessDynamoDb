import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateCoupon, adminUpdateCoupon } from "../../api/adminCoupons.js";
import { logout } from "../../store/authSlice.js";
import {
  TITLE_MAX_LEN,
  COUPON_CODE_MAX_LEN,
  DISCOUNT_TYPES,
  emptyForm,
  getCouponId,
  sanitizeCouponCodeInput,
  sanitizeTitleInput,
  validateCouponForm,
  buildCouponPayload,
} from "./CouponShared.js";

export function CouponForm({ mode = "create", initialCoupon = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialCoupon) return emptyForm();
    return {
      title: initialCoupon.title || "",
      status: initialCoupon.status || "active",
      couponCode: initialCoupon.couponCode || "",
      discountType: initialCoupon.discountType || "percentage",
      value: initialCoupon.value ?? "",
    };
  });
  const editId = isEditMode && initialCoupon ? getCouponId(initialCoupon) : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateCouponForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = buildCouponPayload(form);

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateCoupon(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Coupon updated", timer: 1500 });
      } else {
        await adminCreateCoupon(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Coupon created", timer: 1500 });
      }
      navigate("/admin/coupons");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save coupon." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Title <span className="required-dot">*</span>
            </span>
            <small>
              {form.title.length}/{TITLE_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitleInput(e.target.value) }))}
            maxLength={TITLE_MAX_LEN}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Coupon code <span className="required-dot">*</span>
            </span>
            <small>
              {form.couponCode.length}/{COUPON_CODE_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.couponCode}
            onChange={(e) => setForm((p) => ({ ...p, couponCode: sanitizeCouponCodeInput(e.target.value) }))}
            maxLength={COUPON_CODE_MAX_LEN}
            placeholder="e.g. SUMMER20"
            required
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Discount type</span>
          <select
            className="user-field__input"
            value={form.discountType}
            onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
          >
            {DISCOUNT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Value <span className="required-dot">*</span>
            {form.discountType === "percentage" ? " (%)" : ""}
          </span>
          <input
            className="user-field__input"
            type="number"
            min="0"
            max={form.discountType === "percentage" ? "100" : undefined}
            step={form.discountType === "percentage" ? "1" : "0.01"}
            value={form.value}
            onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
            required
          />
        </label>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/coupons")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update coupon" : "Create coupon"}
        </button>
      </div>
    </form>
  );
}

export function CouponAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create coupon</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/coupons")}>
            Back to list
          </button>
        </div>
        <CouponForm mode="create" />
      </div>
    </div>
  );
}
