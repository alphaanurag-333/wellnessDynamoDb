import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Country } from "country-state-city";
import {
  buildAssistantPayload,
  buildAssistantUpdatePayload,
  coachCreateAssistant,
  coachUpdateAssistant,
} from "../../api/coachAssistants.js";
import { AdminMediaImage } from "../../../admin/components/AdminMediaImage.jsx";
import { CoachSubmitLoader } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  ALL_COUNTRIES,
  DEFAULT_ISO,
  dialCodeFromPhonecode,
} from "../../../admin/pages/wellnessCoach/WellnessCoachShared.js";
import {
  DESIGNATION_MAX_LEN,
  STATUS_OPTIONS,
  assistantToForm,
  emptyAssistantForm,
  resolveAssistantId,
  validateAssistantForm,
} from "./MyAssistantShared.js";
import {
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  EMAIL_MAX_LEN,
  PERSON_NAME_MAX_LEN,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import { validateImageFileSize } from "../../../utils/mediaUploadValidation.js";

export function MyAssistantForm({
  mode = "create",
  assistantId = "",
  initialAssistant = null,
  onCancel,
  onSuccess,
  submitLabel = "Save",
}) {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const [values, setValues] = useState(() =>
    initialAssistant ? assistantToForm(initialAssistant) : emptyAssistantForm()
  );
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputId = useId();

  useEffect(() => {
    setValues(initialAssistant ? assistantToForm(initialAssistant) : emptyAssistantForm());
    setProfileFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialAssistant]);

  useEffect(() => {
    if (!profileFile) return;
    const url = URL.createObjectURL(profileFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  const handleChange = (field) => (e) => {
    setValues((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleNameInput = (e) => {
    setValues((p) => ({ ...p, name: sanitizePersonName(e.target.value) }));
  };

  const handleEmailInput = (e) => {
    setValues((p) => ({ ...p, email: sanitizeEmailInput(e.target.value) }));
  };

  const handlePhoneInput = (e) => {
    setValues((p) => ({ ...p, phone: sanitizePhoneDigits(e.target.value) }));
  };

  const handlePhoneKeyDown = blockPhoneNonDigitKeyDown;
  const handleNameKeyDown = blockPersonNameDigitKeyDown;

  const dialCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={`dial-${c.isoCode}`} value={c.isoCode}>
          {c.name} ({dialCodeFromPhonecode(c.phonecode)})
        </option>
      )),
    []
  );

  const setPhoneCountryIso = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setValues((p) => ({
      ...p,
      phoneCountryIso: code,
      phoneCountryCode: c ? dialCodeFromPhonecode(c.phonecode) : "+91",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!coachToken) return;

    const err = validateAssistantForm(values, { requirePassword: mode === "create" });
    if (err) {
      setFormError(err);
      await Swal.fire({ icon: "error", title: "Validation error", text: err });
      return;
    }

    setSubmitting(true);
    try {
      let assistant;
      if (mode === "create") {
        assistant = await coachCreateAssistant(coachToken, buildAssistantPayload(values), profileFile);
      } else {
        const initial = assistantToForm(initialAssistant);
        const patch = {};
        const next = buildAssistantPayload(values);
        for (const key of Object.keys(next)) {
          if (next[key] !== initial[key]) patch[key] = next[key];
        }
        if (!String(values.password ?? "").trim()) {
          delete patch.password;
        }
        const payload = buildAssistantUpdatePayload(patch);
        if (Object.keys(payload).length === 0 && !profileFile) {
          onSuccess?.(initialAssistant);
          return;
        }
        assistant = await coachUpdateAssistant(
          coachToken,
          assistantId || resolveAssistantId(initialAssistant),
          payload,
          profileFile
        );
      }
      onSuccess?.(assistant);
    } catch (ex) {
      if (ex?.status === 401) {
        dispatch(logoutCoach());
        return;
      }
      const msg = ex.message || "Request failed.";
      setFormError(msg);
      await Swal.fire({ icon: "error", title: "Request failed", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="user-profile-form" onSubmit={handleSubmit}>
      {formError ? (
        <p className="alert alert-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="d-flex flex-column flex-sm-row align-items-start gap-3 pb-4 mb-4 border-bottom">
        <div className="position-relative flex-shrink-0">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="d-none"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const sizeErr = validateImageFileSize(file);
              if (sizeErr) {
                e.target.value = "";
                await Swal.fire({ icon: "error", title: "Validation error", text: sizeErr });
                return;
              }
              setProfileFile(file);
            }}
          />
          <label htmlFor={fileInputId} className="mb-0 d-block" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle border overflow-hidden bg-body-secondary"
              style={{ width: 96, height: 96 }}
            >
              <AdminMediaImage
                path={initialAssistant?.profileImage}
                src={previewUrl || undefined}
                round
                width={96}
                height={96}
                alt="Profile"
              />
            </div>
            <div className="text-center  text-primary mt-2"> Choose image</div>
          </label>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={values.name}
            onChange={handleNameInput}
            onKeyDown={handleNameKeyDown}
            maxLength={PERSON_NAME_MAX_LEN}
            inputMode="text"
            autoCapitalize="words"
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Email <span className="required-dot">*</span>
          </span>
          <input
            type="email"
            className="user-field__input"
            value={values.email}
            onChange={handleEmailInput}
            placeholder="email@example.com"
            autoComplete="email"
            maxLength={EMAIL_MAX_LEN}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            {mode === "create" ? "Password" : "New password"}{" "}
            {mode === "create" ? <span className="required-dot">*</span> : null}
          </span>
          <input
            type="password"
            className="user-field__input"
            value={values.password}
            onChange={handleChange("password")}
            placeholder={mode === "create" ? "Minimum 8 characters" : "Leave blank to keep current password"}
            autoComplete={mode === "create" ? "new-password" : "off"}
            required={mode === "create"}
            minLength={mode === "create" ? 8 : undefined}
          />
        </label>
        <label className="user-field col-12 col-md-6 min-w-0">
          <span className="user-field__label">
            Mobile number <span className="required-dot">*</span>
          </span>
          <div className="d-flex flex-nowrap gap-2 align-items-stretch">
            <select
              className="user-field__input form-select flex-shrink-0"
              style={{ width: "9.5rem", maxWidth: "42%" }}
              value={values.phoneCountryIso || DEFAULT_ISO}
              onChange={(e) => setPhoneCountryIso(e.target.value)}
              aria-label="Country calling code"
              autoComplete="tel-country-code"
              disabled
              aria-readonly="true"
            >
              {dialCountryOptions}
            </select>
            <input
              id={`${fileInputId}-phone`}
              type="tel"
              className="user-field__input flex-grow-1 min-w-0"
              value={values.phone}
              onChange={handlePhoneInput}
              onKeyDown={handlePhoneKeyDown}
              placeholder="9876543210"
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="[0-9]{10}"
              aria-label="Mobile number without country code"
              maxLength={10}
              minLength={10}
              required
            />
          </div>
          <span className="user-field__label small text-body-secondary d-block mt-1">
            10-digit number without country code.
          </span>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Designation</span>
          <input
            className="user-field__input"
            value={values.designation}
            onChange={handleChange("designation")}
            maxLength={DESIGNATION_MAX_LEN}
            placeholder="e.g. Senior assistant"
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select className="user-field__input" value={values.status} onChange={handleChange("status")}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-end pt-3 border-top">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary d-inline-flex align-items-center gap-2" disabled={submitting}>
          {submitting ? <CoachSubmitLoader /> : null}
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
