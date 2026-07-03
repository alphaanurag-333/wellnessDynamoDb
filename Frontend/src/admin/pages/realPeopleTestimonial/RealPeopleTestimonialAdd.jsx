import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateRealPeopleTestimonial,
  adminUpdateRealPeopleTestimonial,
} from "../../api/realPeopleTestimonials.js";
import { adminGetUser } from "../../api/adminUsers.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { logout } from "../../../store/authSlice.js";
import { SEARCH_DEBOUNCE_MS } from "../../../hooks/useDebouncedSearch.js";
import {
  REVIEW_MAX_LEN,
  USER_ID_MAX_LEN,
  emptyForm,
  sanitizeReview,
} from "./RealPeopleTestimonialShared.js";

export function RealPeopleTestimonialForm({ mode = "create", initial = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [saving, setSaving] = useState(false);
  const [userPreview, setUserPreview] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [debouncedUserId, setDebouncedUserId] = useState("");
  const loadRequestRef = useRef(0);
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm();
    return {
      userId: initial.userId || "",
      review: initial.review || initial.content || "",
      stars: String(initial.stars ?? initial.rating ?? 5),
      status: initial.status || "active",
      approvalStatus: initial.approvalStatus || "approved",
    };
  });
  const editId = isEditMode && initial ? initial._id || initial.id || "" : "";

  const loadUserPreview = async (userId) => {
    const id = String(userId || "").trim();
    if (!id || !adminToken) {
      setUserPreview(null);
      setLoadingUser(false);
      return;
    }
    const requestId = ++loadRequestRef.current;
    setLoadingUser(true);
    try {
      const user = await adminGetUser(adminToken, id);
      if (requestId !== loadRequestRef.current) return;
      setUserPreview(user);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setUserPreview(null);
    } finally {
      if (requestId === loadRequestRef.current) setLoadingUser(false);
    }
  };

  useEffect(() => {
    const id = form.userId.trim();
    if (!id) {
      setDebouncedUserId("");
      setUserPreview(null);
      setLoadingUser(false);
      return;
    }
    const timer = window.setTimeout(() => setDebouncedUserId(id), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [form.userId]);

  useEffect(() => {
    if (!debouncedUserId) return;
    loadUserPreview(debouncedUserId);
  }, [adminToken, debouncedUserId]);

  const userIdReady = Boolean(form.userId.trim()) && form.userId.trim() === debouncedUserId;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const userId = form.userId.trim();
    const review = sanitizeReview(form.review, REVIEW_MAX_LEN).trim();
    const stars = Number(form.stars);

    if (!userId) return Swal.fire({ icon: "error", title: "Validation", text: "User ID is required." });
    if (!review || review.length < 5) {
      return Swal.fire({ icon: "error", title: "Validation", text: "Review must be at least 5 characters." });
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return Swal.fire({ icon: "error", title: "Validation", text: "Stars must be 1–5." });
    }

    const payload = {
      userId,
      review,
      stars,
      status: form.status,
      approvalStatus: form.approvalStatus,
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateRealPeopleTestimonial(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Updated", timer: 1500 });
      } else {
        await adminCreateRealPeopleTestimonial(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Created", timer: 1500 });
      }
      navigate("/admin/real-people-testimonials");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">User ID <span className="required-dot">*</span></span>
          <input
            className="user-field__input"
            value={form.userId}
            onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value.slice(0, USER_ID_MAX_LEN) }))}
            placeholder="Paste user UUID"
            maxLength={USER_ID_MAX_LEN}
            required
          />
          <small className="data-table__muted">
            Name, profile, health concern, and member since are loaded from this user. {form.userId.length}/{USER_ID_MAX_LEN}
          </small>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Stars</span>
          <select className="user-field__input" value={form.stars} onChange={(e) => setForm((p) => ({ ...p, stars: e.target.value }))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</option>
            ))}
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Approval</span>
          <select
            className="user-field__input"
            value={form.approvalStatus}
            onChange={(e) => setForm((p) => ({ ...p, approvalStatus: e.target.value }))}
          >
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">Review <span className="required-dot">*</span></span>
          <textarea
            className="user-field__input"
            rows={5}
            value={form.review}
            maxLength={REVIEW_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, review: sanitizeReview(e.target.value, REVIEW_MAX_LEN) }))}
            required
          />
          <small className="data-table__muted">{form.review.length}/{REVIEW_MAX_LEN}</small>
        </label>
      </div>

      {loadingUser ? (
        <p className="data-table__muted" style={{ marginTop: 12 }}>Loading user profile…</p>
      ) : userPreview ? (
        <div className="page-card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <AdminMediaImage path={userPreview.profileImage} round width={56} height={56} alt={userPreview.name || "Profile"} />
            <div>
              <strong>{userPreview.name || "—"}</strong>
              <div className="data-table__muted">
                Health concern: {userPreview.primaryHealthConcern?.title || userPreview.healthConcernTitle || "—"}
              </div>
              <div className="data-table__muted">
                Member since {userPreview.createdAt ? new Date(userPreview.createdAt).getFullYear() : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : userIdReady && !loadingUser ? (
        <p className="data-table__muted" style={{ marginTop: 12 }}>User not found for this ID.</p>
      ) : null}

      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/real-people-testimonials")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function RealPeopleTestimonialAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create real people testimonial"
        subtitle="Link a user and add their review. Profile details come from the user record."
        backTo="/admin/real-people-testimonials"
      />
      <div className="page-card">
        <RealPeopleTestimonialForm mode="create" />
      </div>
    </div>
  );
}
