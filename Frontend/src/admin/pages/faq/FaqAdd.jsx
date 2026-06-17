import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateFaq, adminUpdateFaq } from "../../api/faqController.js";
import { logout } from "../../../store/authSlice.js";
import {
  ANSWER_MAX_LEN,
  QUESTION_MAX_LEN,
  emptyForm,
  getFaqId,
  sanitizeAnswerInput,
  sanitizeQuestionInput,
  validateFaqForm,
} from "./FaqShared.js";

export function FaqForm({ mode = "create", initialFaq = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialFaq) return emptyForm();
    return {
      question: initialFaq.question || "",
      answer: initialFaq.answer || "",
      status: initialFaq.status || "active",
    };
  });
  const editId = isEditMode && initialFaq ? getFaqId(initialFaq) : "";

  const resetForm = () => setForm(emptyForm());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateFaqForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateFaq(adminToken, editId, payload);
        await Swal.fire({ icon: "success", title: "FAQ updated", timer: 1500 });
      } else {
        await adminCreateFaq(adminToken, payload);
        await Swal.fire({ icon: "success", title: "FAQ created", timer: 1500 });
      }
      navigate("/admin/faq");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save FAQ." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Question <span className="required-dot">*</span>
            </span>
            <small>
              {form.question.length}/{QUESTION_MAX_LEN}
            </small>
          </span>
          <input
            className="user-field__input"
            value={form.question}
            onChange={(e) => setForm((p) => ({ ...p, question: sanitizeQuestionInput(e.target.value) }))}
            maxLength={QUESTION_MAX_LEN}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="user-field col-12">
          <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              Answer <span className="required-dot">*</span>
            </span>
            <small>
              {form.answer.length}/{ANSWER_MAX_LEN}
            </small>
          </span>
          <textarea
            className="user-field__input"
            rows={4}
            value={form.answer}
            onChange={(e) => setForm((p) => ({ ...p, answer: sanitizeAnswerInput(e.target.value) }))}
            maxLength={ANSWER_MAX_LEN}
            required
          />
        </label>
      </div>
      <div className="user-form__actions">
        {isEditMode ? (
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/faq")}>
            Cancel edit
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={resetForm}>
            Reset
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update FAQ" : "Create FAQ"}
        </button>
      </div>
    </form>
  );
}

export function FaqAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create FAQ</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/faq")}>
            Back to list
          </button>
        </div>
        <FaqForm mode="create" />
      </div>
    </div>
  );
}
