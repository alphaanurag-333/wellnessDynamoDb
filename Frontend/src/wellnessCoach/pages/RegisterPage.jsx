import { useEffect, useMemo, useState } from "react";
import { Country, State } from "country-state-city";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { coachRegister } from "../api/coachAuth.js";
import { coachListSpecializations } from "../api/coachSpecializations.js";
import {
  ALL_COUNTRIES,
  BIO_MAX_LEN,
  DEFAULT_COUNTRY_NAME,
  DEFAULT_ISO,
  DEFAULT_DIAL,
  dialCodeFromPhonecode,
  getLocationOptions,
  getSpecializationOptionId,
  sanitizeBio,
  validateCoachRegisterFields,
  validateCoachRegisterForm,
} from "../../admin/pages/wellnessCoach/WellnessCoachShared.js";
import { CoachSubmitLoader } from "../components/CoachPageLoader.jsx";
import { AuthPasswordToggle } from "../../components/AuthPasswordToggle.jsx";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import {
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  EMAIL_MAX_LEN,
  INDIAN_MOBILE_INPUT_PATTERN,
  PERSON_NAME_MAX_LEN,
  PHONE_NATIONAL_LEN,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
} from "../../utils/personFieldValidation.js";
import {
  PROFILE_PASSWORD_MAX_LEN,
  PROFILE_PASSWORD_MIN_LEN,
} from "../../utils/profilePasswordValidation.js";

function charCount(value, max) {
  return `${String(value ?? "").length}/${max}`;
}

function AuthFieldMeta({ error, hint, counter }) {
  if (error) {
    return (
      <span className="auth-field__hint auth-field__hint--error" role="alert">
        {error}
      </span>
    );
  }
  if (counter) return <span className="auth-field__hint">{counter}</span>;
  if (hint) return <span className="auth-field__hint">{hint}</span>;
  return null;
}

function emptyRegisterForm() {
  return {
    name: "",
    email: "",
    phoneCountryIso: DEFAULT_ISO,
    phoneCountryCode: DEFAULT_DIAL,
    phone: "",
    password: "",
    confirmPassword: "",
    bio: "",
    specializationId: "",
    countryIso: DEFAULT_ISO,
    country: DEFAULT_COUNTRY_NAME,
    stateCode: "",
    state: "",
    city: "",
  };
}

export function CoachRegisterPage() {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl) || defaultLogo;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyRegisterForm);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [specializationOptions, setSpecializationOptions] = useState([]);
  const [specializationsLoading, setSpecializationsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setSpecializationsLoading(true);
      try {
        const { specializations } = await coachListSpecializations();
        if (!cancelled) setSpecializationOptions(Array.isArray(specializations) ? specializations : []);
      } catch {
        if (!cancelled) setSpecializationOptions([]);
      } finally {
        if (!cancelled) setSpecializationsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dialCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={`dial-${c.isoCode}`} value={c.isoCode}>
          {c.name} ({dialCodeFromPhonecode(c.phonecode)})
        </option>
      )),
    []
  );

  const nameCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={`loc-${c.isoCode}`} value={c.isoCode}>
          {c.name}
        </option>
      )),
    []
  );

  const locationOptions = useMemo(
    () => getLocationOptions(form.countryIso, form.stateCode),
    [form.countryIso, form.stateCode]
  );

  if (coachToken) return <Navigate to="/coach/dashboard" replace />;

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const runFieldValidation = (nextForm, field) => {
    const errors = validateCoachRegisterFields(nextForm);
    if (field) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (errors[field]) next[field] = errors[field];
        else delete next[field];
        return next;
      });
      return errors[field] || "";
    }
    setFieldErrors(errors);
    return validateCoachRegisterForm(nextForm);
  };

  const handleChange = (field) => (e) => {
    clearFieldError(field);
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleEmailInput = (e) => {
    clearFieldError("email");
    setForm((prev) => ({ ...prev, email: sanitizeEmailInput(e.target.value) }));
  };

  const handleNameInput = (e) => {
    clearFieldError("name");
    setForm((prev) => ({ ...prev, name: sanitizePersonName(e.target.value) }));
  };

  const handlePhoneInput = (e) => {
    clearFieldError("phone");
    setForm((prev) => ({ ...prev, phone: sanitizePhoneDigits(e.target.value) }));
  };

  const handleBioInput = (e) => {
    clearFieldError("bio");
    setForm((prev) => ({ ...prev, bio: sanitizeBio(e.target.value) }));
  };

  const handlePhoneKeyDown = blockIndianMobileFirstDigitKeyDown;
  const handleNameKeyDown = blockPersonNameDigitKeyDown;

  const setPhoneCountryIso = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setForm((prev) => ({
      ...prev,
      phoneCountryIso: code,
      phoneCountryCode: c ? dialCodeFromPhonecode(c.phonecode) : DEFAULT_DIAL,
    }));
  };

  const setLocationCountryIso = (iso) => {
    const code = iso || "";
    const c = Country.getCountryByCode(code);
    setForm((prev) => ({
      ...prev,
      countryIso: code,
      country: c?.name ?? "",
      stateCode: "",
      state: "",
      city: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = runFieldValidation(form);
    if (err) {
      return Swal.fire({ icon: "warning", title: "Validation", text: err, confirmButtonColor: "#ea580c" });
    }

    setLoading(true);
    try {
      await coachRegister({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        phoneCountryCode: form.phoneCountryCode || DEFAULT_DIAL,
        password: form.password,
        bio: form.bio.trim() || undefined,
        specializationId: form.specializationId.trim(),
        country: form.country.trim(),
        state: form.state.trim() || undefined,
        city: form.city.trim(),
      });
      await Swal.fire({
        icon: "success",
        title: "Registration submitted!",
        text: "Your account is pending admin approval. You will be able to login once approved.",
        confirmButtonColor: "#ea580c",
      });
      navigate("/coach/login", { replace: true });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Registration failed",
        text: err.message || "Could not register. Please try again.",
        confirmButtonColor: "#ea580c",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--register">
      <div className="auth-card auth-card--register">
        <div className="auth-register-head">
          <div className="auth-brand auth-brand--compact">
            <span className="auth-brand__mark" aria-hidden="true">
              <img
                src={brandLogoSrc}
                alt=""
                className="auth-brand__logo-img auth-brand__logo-img--compact"
                width={112}
                height="auto"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultLogo;
                }}
              />
            </span>
          </div>
          <div className="auth-register-head__text">
            <h1 className="auth-card__title auth-card__title--compact">Register as Wellness Coach</h1>
            <p className="auth-card__subtitle auth-card__subtitle--compact">
              Admin approval is required before you can log in.
            </p>
          </div>
        </div>

        <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
          <div className="row g-3">
            <label className={`auth-field col-12 col-md-6${fieldErrors.name ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Full name <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleNameInput}
                  onKeyDown={handleNameKeyDown}
                  onBlur={() => runFieldValidation(form, "name")}
                  placeholder="Your full name"
                  maxLength={PERSON_NAME_MAX_LEN}
                  minLength={2}
                  inputMode="text"
                  autoCapitalize="words"
                  aria-invalid={fieldErrors.name ? "true" : undefined}
                  required
                />
              </div>
              <AuthFieldMeta
                error={fieldErrors.name}
                hint={`Letters only, ${PERSON_NAME_MAX_LEN} characters max.`}
                counter={charCount(form.name, PERSON_NAME_MAX_LEN)}
              />
            </label>

            <label className={`auth-field col-12 col-md-6${fieldErrors.email ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Email address <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleEmailInput}
                  onBlur={() => runFieldValidation(form, "email")}
                  placeholder="abc@example.com"
                  autoComplete="email"
                  maxLength={EMAIL_MAX_LEN}
                  aria-invalid={fieldErrors.email ? "true" : undefined}
                  required
                />
              </div>
              <AuthFieldMeta
                error={fieldErrors.email}
                counter={charCount(form.email, EMAIL_MAX_LEN)}
              />
            </label>

            <div className={`auth-field col-12 col-md-6${fieldErrors.phone ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Mobile number <span className="required-dot">*</span>
              </span>
              <div className="auth-phone-row auth-phone-row--compact">
                <select
                  className="auth-select auth-select--compact"
                  value={form.phoneCountryIso || DEFAULT_ISO}
                  onChange={(e) => setPhoneCountryIso(e.target.value)}
                  aria-label="Country calling code"
                  autoComplete="tel-country-code"
                  disabled
                  aria-readonly="true"
                >
                  {dialCountryOptions}
                </select>
                <div className="auth-input-wrap auth-input-wrap--compact">
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handlePhoneInput}
                    onKeyDown={handlePhoneKeyDown}
                    onBlur={() => runFieldValidation(form, "phone")}
                    placeholder="9876543210"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern={INDIAN_MOBILE_INPUT_PATTERN}
                    maxLength={PHONE_NATIONAL_LEN}
                    minLength={PHONE_NATIONAL_LEN}
                    aria-invalid={fieldErrors.phone ? "true" : undefined}
                    required
                  />
                </div>
              </div>
              <AuthFieldMeta
                error={fieldErrors.phone}
                hint={`${PHONE_NATIONAL_LEN}-digit Indian mobile number starting with 6–9.`}
                counter={charCount(form.phone, PHONE_NATIONAL_LEN)}
              />
            </div>

            <label className={`auth-field col-12 col-md-6${fieldErrors.specializationId ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Specialization <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                name="specializationId"
                value={form.specializationId}
                onChange={handleChange("specializationId")}
                onBlur={() => runFieldValidation(form, "specializationId")}
                disabled={specializationsLoading || specializationOptions.length === 0}
                aria-invalid={fieldErrors.specializationId ? "true" : undefined}
                required
              >
                <option value="">
                  {specializationsLoading ? "Loading specializations…" : "Select specialization"}
                </option>
                {specializationOptions.map((opt) => {
                  const id = getSpecializationOptionId(opt);
                  return (
                    <option key={id} value={id}>
                      {opt.title}
                    </option>
                  );
                })}
              </select>
              <AuthFieldMeta error={fieldErrors.specializationId} />
            </label>

            <label className={`auth-field col-12 col-md-6${fieldErrors.password ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Password <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={() => runFieldValidation(form, "password")}
                  placeholder={`${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters`}
                  autoComplete="new-password"
                  minLength={PROFILE_PASSWORD_MIN_LEN}
                  maxLength={PROFILE_PASSWORD_MAX_LEN}
                  aria-invalid={fieldErrors.password ? "true" : undefined}
                  required
                />
                <AuthPasswordToggle
                  visible={passwordVisible}
                  onToggle={() => setPasswordVisible((v) => !v)}
                />
              </div>
              <AuthFieldMeta
                error={fieldErrors.password}
                hint={`Use ${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters.`}
                counter={charCount(form.password, PROFILE_PASSWORD_MAX_LEN)}
              />
            </label>

            <label className={`auth-field col-12 col-md-6${fieldErrors.confirmPassword ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                Confirm password <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type={confirmVisible ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  onBlur={() => runFieldValidation(form, "confirmPassword")}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  minLength={PROFILE_PASSWORD_MIN_LEN}
                  maxLength={PROFILE_PASSWORD_MAX_LEN}
                  aria-invalid={fieldErrors.confirmPassword ? "true" : undefined}
                  required
                />
                <AuthPasswordToggle
                  visible={confirmVisible}
                  onToggle={() => setConfirmVisible((v) => !v)}
                />
              </div>
              <AuthFieldMeta error={fieldErrors.confirmPassword} />
            </label>

            <label className={`auth-field col-12${fieldErrors.bio ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">Bio</span>
              <div className="auth-input-wrap auth-input-wrap--compact auth-input-wrap--textarea">
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleBioInput}
                  onBlur={() => runFieldValidation(form, "bio")}
                  placeholder="Brief introduction…"
                  rows={3}
                  maxLength={BIO_MAX_LEN}
                  aria-invalid={fieldErrors.bio ? "true" : undefined}
                />
              </div>
              <AuthFieldMeta
                error={fieldErrors.bio}
                counter={charCount(form.bio, BIO_MAX_LEN)}
              />
            </label>

            <div className="col-12">
              <p className="auth-form-section__title auth-form-section__title--inline">Location</p>
            </div>

            <label className="auth-field col-12 col-md-4">
              <span className="auth-field__label">
                Country <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                value={form.countryIso || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setLocationCountryIso(v);
                }}
                disabled
                aria-readonly="true"
                required
              >
                {!form.countryIso ? (
                  <option value="" disabled>
                    Select country
                  </option>
                ) : null}
                {nameCountryOptions}
              </select>
            </label>

            <label className={`auth-field col-12 col-md-4${fieldErrors.state ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                State / region <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                value={form.stateCode || ""}
                disabled={!form.countryIso || locationOptions.citiesFromCountry}
                required={!locationOptions.citiesFromCountry}
                aria-invalid={fieldErrors.state ? "true" : undefined}
                onChange={(e) => {
                  clearFieldError("state");
                  clearFieldError("city");
                  const sc = e.target.value;
                  const st =
                    form.countryIso && sc
                      ? (State.getStatesOfCountry(form.countryIso) || []).find((s) => s.isoCode === sc)
                      : null;
                  setForm((prev) => ({
                    ...prev,
                    stateCode: sc,
                    state: st?.name ?? "",
                    city: "",
                  }));
                }}
                onBlur={() => runFieldValidation(form, "state")}
              >
                <option value="">
                  {!form.countryIso
                    ? "Select country"
                    : locationOptions.citiesFromCountry
                      ? "No states"
                      : "Select state"}
                </option>
                {locationOptions.states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </select>
              <AuthFieldMeta error={fieldErrors.state} />
            </label>

            <label className={`auth-field col-12 col-md-4${fieldErrors.city ? " auth-field--invalid" : ""}`}>
              <span className="auth-field__label">
                City <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                value={form.city || ""}
                disabled={
                  !form.countryIso ||
                  (!locationOptions.citiesFromCountry &&
                    !form.stateCode &&
                    locationOptions.states.length > 0)
                }
                required
                aria-invalid={fieldErrors.city ? "true" : undefined}
                onChange={(e) => {
                  clearFieldError("city");
                  setForm((prev) => ({ ...prev, city: e.target.value }));
                }}
                onBlur={() => runFieldValidation(form, "city")}
              >
                <option value="">
                  {!form.countryIso
                    ? "Select country"
                    : !locationOptions.citiesFromCountry &&
                        !form.stateCode &&
                        locationOptions.states.length > 0
                      ? "Select state"
                      : "Select city"}
                </option>
                {locationOptions.cities.map((ct) => (
                  <option key={`${ct.countryCode}-${ct.stateCode}-${ct.name}`} value={ct.name}>
                    {ct.name}
                  </option>
                ))}
              </select>
              <AuthFieldMeta error={fieldErrors.city} />
            </label>
          </div>

          <div className="auth-register-actions">
            <button type="submit" className="auth-submit auth-submit--compact auth-submit--with-loader" disabled={loading}>
              {loading ? <CoachSubmitLoader /> : null}
              {loading ? "Submitting…" : "Submit registration"}
            </button>
            <p className="auth-footer-link auth-footer-link--inline">
              Already have an account?{" "}
              <Link to="/coach/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
