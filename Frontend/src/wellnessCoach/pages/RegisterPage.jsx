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
  NAME_MAX_LEN,
  dialCodeFromPhonecode,
  getLocationOptions,
  getSpecializationOptionId,
} from "../../admin/pages/wellnessCoach/WellnessCoachShared.js";
import { CoachSubmitLoader } from "../components/CoachPageLoader.jsx";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";

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

function validateRegisterForm(form) {
  const name = String(form.name ?? "").trim();
  const email = String(form.email ?? "").trim();
  const phone = String(form.phone ?? "").trim();
  const password = String(form.password ?? "");
  const confirmPassword = String(form.confirmPassword ?? "");

  if (!name || name.length < 2) return "Name is required (at least 2 characters).";
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (!phone) return "Mobile number is required.";
  if (!/^\d+$/.test(phone)) return "Mobile number should contain digits only.";
  if (phone.length !== 10) return "Mobile number must be exactly 10 digits.";
  if (!password) return "Password is required (minimum 8 characters).";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  if (!String(form.specializationId ?? "").trim()) return "Specialization is required.";

  if (!String(form.country ?? "").trim()) return "Country is required.";
  const loc = getLocationOptions(form.countryIso, form.stateCode);
  if (!loc.citiesFromCountry && !String(form.state ?? "").trim()) {
    const states = State.getStatesOfCountry(form.countryIso) || [];
    if (states.length > 0) return "State / region is required.";
  }
  if (!String(form.city ?? "").trim()) return "City is required.";

  return "";
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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePhoneInput = (e) => {
    setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }));
  };

  const handlePhoneKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  };

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
    const err = validateRegisterForm(form);
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
            <label className="auth-field col-12 col-md-6">
              <span className="auth-field__label">
                Full name <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Your full name"
                  maxLength={NAME_MAX_LEN}
                  required
                />
              </div>
            </label>

            <label className="auth-field col-12 col-md-6">
              <span className="auth-field__label">
                Email address <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  placeholder="abc@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <div className="auth-field col-12 col-md-6">
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
                    placeholder="9876543210"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    required
                  />
                </div>
              </div>
            </div>

            <label className="auth-field col-12 col-md-6">
              <span className="auth-field__label">
                Specialization <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                name="specializationId"
                value={form.specializationId}
                onChange={handleChange("specializationId")}
                disabled={specializationsLoading || specializationOptions.length === 0}
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
            </label>

            <label className="auth-field col-12 col-md-6">
              <span className="auth-field__label">
                Password <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  onClick={() => setPasswordVisible((v) => !v)}
                >
                  {passwordVisible ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="auth-field col-12 col-md-6">
              <span className="auth-field__label">
                Confirm password <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap auth-input-wrap--compact">
                <input
                  type={confirmVisible ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={confirmVisible ? "Hide password" : "Show password"}
                  onClick={() => setConfirmVisible((v) => !v)}
                >
                  {confirmVisible ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="auth-field col-12">
              <span className="auth-field__label">Bio</span>
              <div className="auth-input-wrap auth-input-wrap--compact auth-input-wrap--textarea">
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange("bio")}
                  placeholder="Brief introduction…"
                  rows={1}
                  maxLength={BIO_MAX_LEN}
                />
              </div>
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

            <label className="auth-field col-12 col-md-4">
              <span className="auth-field__label">
                State / region <span className="required-dot">*</span>
              </span>
              <select
                className="auth-select auth-select--compact"
                value={form.stateCode || ""}
                disabled={!form.countryIso || locationOptions.citiesFromCountry}
                required={!locationOptions.citiesFromCountry}
                onChange={(e) => {
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
            </label>

            <label className="auth-field col-12 col-md-4">
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
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
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
