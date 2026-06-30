import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateMedicalConditionQuestion,
  adminUpdateMedicalConditionQuestion,
} from "../../api/adminMedicalConditionQuestions.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  ANSWER_TYPE_OPTIONS,
  QUESTION_MAX_LEN,
  QUESTION_MIN_LEN,
  emptyForm,
  sanitizeQuestion,
  validateForm,
} from "./MedicalConditionQuestionShared.js";

export function MedicalConditionQuestionForm({ mode = "create", initialQuestion = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialQuestion) return emptyForm();
    return {
      question: initialQuestion.question || "",
      answerType: initialQuestion.answerType || "yes_no",
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
      question: form.question.trim(),
      answerType: form.answerType || "text",
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateMedicalConditionQuestion(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "Question updated", timer: 1500 });
      } else {
        await adminCreateMedicalConditionQuestion(adminToken, payload);
        await Swal.fire({ icon: "success", title: "Question created", timer: 1500 });
      }
      navigate("/admin/medical-condition-questions");
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
            Answer type <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.answerType}
            onChange={(e) => setForm((p) => ({ ...p, answerType: e.target.value }))}
          >
            {ANSWER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
            onChange={(e) => setForm((p) => ({ ...p, question: sanitizeQuestion(e.target.value) }))}
            placeholder="Do You Have Any Medical Conditions?"
            required
          />
          <small className="data-table__muted">
            {form.question.trim().length}/{QUESTION_MAX_LEN} (min {QUESTION_MIN_LEN})
          </small>
        </label>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/medical-condition-questions")}>
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

export function MedicalConditionQuestionAdd() {
  return (
    <div className="user-page">
      <AdminPageHeader
        title="Create medical condition question"
        subtitle="Add an onboarding medical condition question."
        backTo="/admin/medical-condition-questions"
      />
      <div className="page-card">
        <MedicalConditionQuestionForm mode="create" />
      </div>
    </div>
  );
}
