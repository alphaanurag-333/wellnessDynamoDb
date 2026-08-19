import { useEffect, useMemo, useRef, useState } from "react";
import { adminListHealthConcerns } from "../api/healthConcernApi.js";
import { createUser } from "../api/usersApi.js";
import {
  COUNTRY_OPTIONS,
  INDIA_STATES,
  PHONE_COUNTRY_OPTIONS,
  citiesForState,
} from "../data/indiaLocations.js";
import {
  EMAIL_MAX_LEN,
  PERSON_NAME_MAX_LEN,
  PINCODE_LEN,
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
  sanitizePincode,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
  validatePincode,
} from "../utils/personFieldValidation.js";

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Disabled" },
];

function emptyForm() {
  return {
    name: "",
    email: "",
    dob: "",
    gender: "male",
    whatsappSameAsMobile: true,
    phoneCountryCode: "+91",
    phone: "",
    whatsappCountryCode: "+91",
    whatsappPhone: "",
    country: "India",
    state: "",
    city: "",
    pincode: "",
    primaryHealthConcern: "",
    primaryHealthConcernOther: "",
    referralCode: "",
    status: "active",
    termsAccepted: false,
  };
}

function RequiredMark() {
  return <span className="ua-create-user__req" aria-hidden="true">*</span>;
}

function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <label className={`ua-create-user__field ${className}`.trim()}>
      <span className="ua-create-user__label">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {children}
      {error ? <span className="ua-create-user__error">{error}</span> : null}
      {!error && hint ? <span className="ua-create-user__hint">{hint}</span> : null}
    </label>
  );
}

function isOtherConcern(concerns, id) {
  const row = concerns.find((c) => c.id === id);
  return String(row?.title || "").trim().toLowerCase() === "other";
}

export function CreateUserModal({ open, onClose, onCreated, onToast }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [concerns, setConcerns] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const indiaSelected = form.country === "India";
  const cityOptions = useMemo(() => citiesForState(form.state), [form.state]);
  const showOtherConcern = isOtherConcern(concerns, form.primaryHealthConcern);

  useEffect(() => {
    if (!open) return undefined;
    setForm(emptyForm());
    setErrors({});
    setImageFile(null);
    setImagePreview("");
    setSubmitError("");
    setBusy(false);

    let cancelled = false;
    adminListHealthConcerns(null, { limit: 200, status: "active" })
      .then((result) => {
        if (cancelled) return;
        setConcerns(
          (result?.healthConcerns || [])
            .filter((row) => row?.id && row?.title)
            .map((row) => ({ id: row.id, title: row.title })),
        );
      })
      .catch(() => {
        if (!cancelled) setConcerns([]);
      });

    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (!open) return null;

  function patch(next) {
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (merged.whatsappSameAsMobile) {
        merged.whatsappCountryCode = merged.phoneCountryCode;
        merged.whatsappPhone = merged.phone;
      }
      return merged;
    });
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      onToast?.("Use JPEG, PNG, GIF, or WebP");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      onToast?.("Profile image must be 25 MB or smaller");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function validate() {
    const next = {};
    const nameErr = validatePersonName(form.name);
    if (nameErr) next.name = nameErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) next.email = emailErr;
    if (!form.dob) next.dob = "Date of birth is required.";
    else if (form.dob > new Date().toISOString().slice(0, 10)) {
      next.dob = "Date of birth cannot be in the future.";
    }
    if (!form.gender) next.gender = "Gender is required.";
    const phoneErr = validatePhoneDigits(form.phone);
    if (phoneErr) next.phone = phoneErr;
    if (!form.whatsappSameAsMobile) {
      const waErr = validatePhoneDigits(form.whatsappPhone, { label: "WhatsApp number" });
      if (waErr) next.whatsappPhone = waErr;
    }
    if (!form.country) next.country = "Country is required.";
    if (!String(form.state || "").trim()) next.state = "State / region is required.";
    if (!String(form.city || "").trim()) next.city = "City is required.";
    const pinErr = validatePincode(form.pincode);
    if (pinErr) next.pincode = pinErr;
    if (!form.primaryHealthConcern) next.primaryHealthConcern = "Primary health concern is required.";
    if (showOtherConcern && !String(form.primaryHealthConcernOther || "").trim()) {
      next.primaryHealthConcernOther = "Please describe the health concern.";
    }
    if (!form.status) next.status = "Account status is required.";
    if (!form.termsAccepted) next.termsAccepted = "Terms and conditions must be accepted.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitError("");
    if (busy || !validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      dob: form.dob,
      gender: form.gender,
      phoneCountryCode: form.phoneCountryCode,
      phone: form.phone,
      whatsappSameAsMobile: form.whatsappSameAsMobile,
      country: form.country,
      state: form.state.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      primaryHealthConcern: form.primaryHealthConcern,
      status: form.status,
      termsAccepted: true,
    };
    if (String(form.referralCode || "").trim()) {
      payload.referralCode = String(form.referralCode).trim().toUpperCase();
    }
    if (!form.whatsappSameAsMobile) {
      payload.whatsappCountryCode = form.whatsappCountryCode;
      payload.whatsappPhone = form.whatsappPhone;
    }
    if (showOtherConcern) {
      payload.primaryHealthConcernOther = form.primaryHealthConcernOther.trim();
    }

    setBusy(true);
    try {
      const created = await createUser(payload, imageFile);
      onToast?.(`${created.name} created`);
      onCreated?.(created);
      onClose();
    } catch (err) {
      setSubmitError(err?.message || "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-create-user-backdrop" role="presentation">
      <form
        className="ua-create-user"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
      >
        <div className="ua-create-user__head">
          <div>
            <div className="ua-create-user__kicker">User management</div>
            <h2 id="create-user-title" className="ua-create-user__title">Create user</h2>
          </div>
          <button type="button" className="ua-create-user__close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-create-user__body">
          {submitError ? <div className="ua-create-user__banner">{submitError}</div> : null}

          <div className="ua-create-user__photo">
            <button
              type="button"
              className="ua-create-user__avatar"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Choose profile image"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <span>Photo</span>
              )}
            </button>
            <div className="ua-create-user__photo-copy">
              <div className="ua-create-user__photo-label">Profile image</div>
              <p>Optional. Crop to 400 × 400px (max 25 MB). JPEG, PNG, GIF, or WebP.</p>
              <button
                type="button"
                className="ua-create-user__choose"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Choose image
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden
              onChange={chooseImage}
            />
          </div>

          <div className="ua-create-user__section">BASIC DETAILS</div>
          <div className="ua-create-user__grid">
            <Field label="Full name" required hint="Letters only, up to 35 characters." error={errors.name}>
              <input
                className="ua-create-user__input"
                placeholder="Full name"
                maxLength={PERSON_NAME_MAX_LEN}
                value={form.name}
                disabled={busy}
                onKeyDown={blockPersonNameDigitKeyDown}
                onChange={(e) => patch({ name: sanitizePersonName(e.target.value) })}
              />
            </Field>
            <Field label="Email" required hint="Up to 50 characters." error={errors.email}>
              <input
                className="ua-create-user__input"
                type="email"
                placeholder="email@example.com"
                maxLength={EMAIL_MAX_LEN}
                value={form.email}
                disabled={busy}
                onChange={(e) => patch({ email: sanitizeEmailInput(e.target.value) })}
              />
            </Field>
            <Field label="Date of birth" required error={errors.dob}>
              <input
                className="ua-create-user__input"
                type="date"
                value={form.dob}
                max={new Date().toISOString().slice(0, 10)}
                disabled={busy}
                onChange={(e) => patch({ dob: e.target.value })}
              />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select
                className="ua-create-user__input"
                value={form.gender}
                disabled={busy}
                onChange={(e) => patch({ gender: e.target.value })}
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="ua-create-user__section">CONTACT</div>
          <label className="ua-create-user__check">
            <input
              type="checkbox"
              checked={form.whatsappSameAsMobile}
              disabled={busy}
              onChange={(e) => patch({ whatsappSameAsMobile: e.target.checked })}
            />
            WhatsApp same as mobile
          </label>
          <div className="ua-create-user__grid">
            <Field
              label="Mobile number"
              required
              hint="10-digit Indian mobile (must start with 6, 7, 8, or 9)."
              error={errors.phone}
            >
              <div className="ua-create-user__phone">
                <select
                  className="ua-create-user__input ua-create-user__dial"
                  value={form.phoneCountryCode}
                  disabled={busy}
                  onChange={(e) => patch({ phoneCountryCode: e.target.value })}
                >
                  {PHONE_COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.dial} value={opt.dial}>{opt.label}</option>
                  ))}
                </select>
                <input
                  className="ua-create-user__input"
                  inputMode="numeric"
                  placeholder="9876543210"
                  maxLength={10}
                  value={form.phone}
                  disabled={busy}
                  onKeyDown={blockIndianMobileFirstDigitKeyDown}
                  onChange={(e) => patch({ phone: sanitizePhoneDigits(e.target.value) })}
                />
              </div>
            </Field>
            <Field
              label="WhatsApp number"
              required
              hint={form.whatsappSameAsMobile ? "Matches mobile number." : "10-digit Indian mobile (must start with 6, 7, 8, or 9)."}
              error={errors.whatsappPhone}
            >
              <div className="ua-create-user__phone">
                <select
                  className="ua-create-user__input ua-create-user__dial"
                  value={form.whatsappSameAsMobile ? form.phoneCountryCode : form.whatsappCountryCode}
                  disabled={busy || form.whatsappSameAsMobile}
                  onChange={(e) => patch({ whatsappCountryCode: e.target.value })}
                >
                  {PHONE_COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.dial} value={opt.dial}>{opt.label}</option>
                  ))}
                </select>
                <input
                  className="ua-create-user__input"
                  inputMode="numeric"
                  placeholder="9876543210"
                  maxLength={10}
                  value={form.whatsappSameAsMobile ? form.phone : form.whatsappPhone}
                  disabled={busy || form.whatsappSameAsMobile}
                  onKeyDown={blockIndianMobileFirstDigitKeyDown}
                  onChange={(e) => patch({ whatsappPhone: sanitizePhoneDigits(e.target.value) })}
                />
              </div>
            </Field>
          </div>

          <div className="ua-create-user__section">LOCATION</div>
          <div className="ua-create-user__grid">
            <Field label="Country" required error={errors.country}>
              <select
                className="ua-create-user__input"
                value={form.country}
                disabled={busy}
                onChange={(e) => patch({ country: e.target.value, state: "", city: "" })}
              >
                {COUNTRY_OPTIONS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="State / region" required error={errors.state}>
              {indiaSelected ? (
                <select
                  className="ua-create-user__input"
                  value={form.state}
                  disabled={busy}
                  onChange={(e) => patch({ state: e.target.value, city: "" })}
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="ua-create-user__input"
                  placeholder="State / region"
                  value={form.state}
                  disabled={busy}
                  onChange={(e) => patch({ state: e.target.value })}
                />
              )}
            </Field>
            <Field label="City" required error={errors.city}>
              {indiaSelected ? (
                <select
                  className="ua-create-user__input"
                  value={form.city}
                  disabled={busy || !form.state}
                  onChange={(e) => patch({ city: e.target.value })}
                >
                  <option value="">{form.state ? "Select city" : "Select state first"}</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="ua-create-user__input"
                  placeholder="City"
                  value={form.city}
                  disabled={busy}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              )}
            </Field>
            <Field
              label="Pin code"
              required
              hint="6-digit Indian PIN code."
              error={errors.pincode}
            >
              <input
                className="ua-create-user__input"
                inputMode="numeric"
                placeholder="400001"
                maxLength={PINCODE_LEN}
                value={form.pincode}
                disabled={busy}
                onKeyDown={blockPhoneNonDigitKeyDown}
                onChange={(e) => patch({ pincode: sanitizePincode(e.target.value) })}
              />
            </Field>
          </div>

          <div className="ua-create-user__section">ACCOUNT & PREFERENCES</div>
          <div className="ua-create-user__grid">
            <Field label="Primary health concern" required error={errors.primaryHealthConcern}>
              <select
                className="ua-create-user__input"
                value={form.primaryHealthConcern}
                disabled={busy}
                onChange={(e) => patch({ primaryHealthConcern: e.target.value, primaryHealthConcernOther: "" })}
              >
                <option value="">Select primary health concern</option>
                {concerns.map((row) => (
                  <option key={row.id} value={row.id}>{row.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Account status" required error={errors.status}>
              <select
                className="ua-create-user__input"
                value={form.status}
                disabled={busy}
                onChange={(e) => patch({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Coach referral code"
              hint="Optional. Example IRW-WC-980 — assigns that Wellness Coach after create / consultancy payment."
            >
              <input
                className="ua-create-user__input"
                placeholder="IRW-WC-980"
                value={form.referralCode}
                disabled={busy}
                autoCapitalize="characters"
                onChange={(e) => patch({ referralCode: e.target.value.toUpperCase() })}
              />
            </Field>
            {showOtherConcern ? (
              <Field
                className="ua-create-user__field--span"
                label="Describe concern"
                required
                error={errors.primaryHealthConcernOther}
              >
                <input
                  className="ua-create-user__input"
                  placeholder="Other health concern"
                  maxLength={120}
                  value={form.primaryHealthConcernOther}
                  disabled={busy}
                  onChange={(e) => patch({ primaryHealthConcernOther: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          <label className={`ua-create-user__check${errors.termsAccepted ? " ua-create-user__check--error" : ""}`}>
            <input
              type="checkbox"
              checked={form.termsAccepted}
              disabled={busy}
              onChange={(e) => patch({ termsAccepted: e.target.checked })}
            />
            <span>
              I accept the terms and conditions
              <RequiredMark />
            </span>
          </label>
          {errors.termsAccepted ? <div className="ua-create-user__error">{errors.termsAccepted}</div> : null}
        </div>

        <div className="ua-create-user__foot">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="ua-btn-orange ua-create-user__submit" disabled={busy}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}
