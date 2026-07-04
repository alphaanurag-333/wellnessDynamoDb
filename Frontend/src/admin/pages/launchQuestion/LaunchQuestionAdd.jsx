import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateLaunchQuestion, adminUpdateLaunchQuestion } from "../../api/adminLaunchQuestions.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  CATEGORY_MAX_LEN,
  QUESTION_MAX_LEN,
  QUESTION_MIN_LEN,
  SORT_ORDER_MAX,
  SORT_ORDER_MIN,
  emptyForm,
  sanitizeSortOrder,
  sanitizeText,
  validateForm,
} from "./LaunchQuestionShared.js";

export function LaunchQuestionForm({ mode = "create", initialQuestion = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialQuestion) return emptyForm();
    return {
      category: initialQuestion.category || "",
      question: initialQuestion.question || "",
      sortOrder: initialQuestion.sortOrder ?? 0,
      status: initialQuestion.status || "active",
    };
  });
  const editId = isEditMode && initialQuestion ? initialQuestion._id || initialQuestion.id || "" : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const payload = {
      category: form.category.trim(),
      question: form.question.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateLaunchQuestion(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Question updated", timer: 1500 });
      } else {
        await adminCreateLaunchQuestion(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Question created", timer: 1500 });
      }
      navigate("/admin/launch-questions");
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
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Category <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.category}
            maxLength={CATEGORY_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, category: sanitizeText(e.target.value, CATEGORY_MAX_LEN) }))}
            placeholder="e.g. General Information"
            required
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Sort order</span>
          <input
            className="user-field__input"
            type="number"
            min={SORT_ORDER_MIN}
            max={SORT_ORDER_MAX}
            step={1}
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: sanitizeSortOrder(e.target.value) }))}
          />
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">Status</span>
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label">
            Question <span className="required-dot">*</span>
          </span>
          <textarea
            className="user-field__input"
            rows={3}
            value={form.question}
            minLength={QUESTION_MIN_LEN}
            maxLength={QUESTION_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, question: sanitizeText(e.target.value, QUESTION_MAX_LEN) }))}
            placeholder="What is the first thing you have after waking up?"
            required
          />
          <small className="data-table__muted">
            {form.question.trim().length}/{QUESTION_MAX_LEN} (min {QUESTION_MIN_LEN})
          </small>
        </label>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/launch-questions")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function LaunchQuestionAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create LAUNCH question"
        subtitle="Add a question to the LAUNCH lifestyle assessment."
        backTo="/admin/launch-questions"
      />
      <div className="page-card">
        <LaunchQuestionForm mode="create" />
      </div>
    </div>
  );
}
