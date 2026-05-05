import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { City, Country, State } from "country-state-city";
import { adminCreateUser, adminUpdateUser } from "../../api/adminUsers.js";
import { adminListHealthConcerns } from "../../api/adminHealthConcerns.js";
import { mediaUrl } from "../../media.js";
import { logout } from "../../store/authSlice.js";

const GENDER_VALUES = ["male", "female", "other", "boy", "girl", "guess"];

const ALL_COUNTRIES = Country.sortByIsoCode([...Country.getAllCountries()]);

function dialCodeFromPhonecode(phonecode) {
  const raw = String(phonecode ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

const DEFAULT_ISO = "IN";
const DEFAULT_COUNTRY_META = Country.getCountryByCode(DEFAULT_ISO);
const DEFAULT_DIAL = DEFAULT_COUNTRY_META
  ? dialCodeFromPhonecode(DEFAULT_COUNTRY_META.phonecode)
  : "+91";
const DEFAULT_COUNTRY_NAME = DEFAULT_COUNTRY_META?.name ?? "India";

function dialNormalize(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

function findIsoForDial(dial) {
  const want = dialNormalize(dial);
  if (!want) return "";
  const wantNoPlus = want.replace(/^\+/, "");
  const hit = ALL_COUNTRIES.find((c) => {
    const d = dialNormalize(dialCodeFromPhonecode(c.phonecode));
    const dNo = d.replace(/^\+/, "");
    return d === want || dNo === wantNoPlus;
  });
  return hit?.isoCode ?? "";
}

function findIsoForCountryName(name) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return "";
  let hit = ALL_COUNTRIES.find((c) => c.name.toLowerCase() === n);
  if (hit) return hit.isoCode;
  const aliases = { usa: "US", uk: "GB", uae: "AE", india: "IN" };
  if (aliases[n]) return aliases[n];
  hit = ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase().startsWith(n) || n.startsWith(c.name.toLowerCase()),
  );
  return hit?.isoCode ?? "";
}

function findStateCodeForName(countryIso, stateName) {
  if (!countryIso || !String(stateName ?? "").trim()) return "";
  const n = String(stateName).trim().toLowerCase();
  const list = State.getStatesOfCountry(countryIso) || [];
  const hit = list.find((s) => s.name.toLowerCase() === n);
  return hit?.isoCode ?? "";
}

function emptyUserForm() {
  return {
    name: "",
    email: "",
    password: "",
    phoneCountryIso: DEFAULT_ISO,
    phoneCountryCode: DEFAULT_DIAL,
    phone: "",
    whatsappSameAsMobile: true,
    whatsappCountryIso: DEFAULT_ISO,
    whatsappCountryCode: DEFAULT_DIAL,
    whatsappPhone: "",
    dob: "",
    gender: "boy",
    countryIso: DEFAULT_ISO,
    country: DEFAULT_COUNTRY_NAME,
    stateCode: "",
    state: "",
    city: "",
    primaryHealthConcern: "",
    termsAccepted: false,
    fcm_id: "",
    status: "active",
  };
}

function userToFormValues(user) {
  if (!user) return emptyUserForm();
  let dob = "";
  if (user.dob) {
    const d = new Date(user.dob);
    if (!Number.isNaN(d.getTime())) dob = d.toISOString().slice(0, 10);
  }
  const phc = user.primaryHealthConcern;
  const phcStr =
    phc && typeof phc === "object" && phc._id != null
      ? String(phc._id)
      : phc != null
        ? String(phc)
        : "";
  const phoneCc =
    user.phoneCountryCode != null ? String(user.phoneCountryCode).trim() : DEFAULT_DIAL;
  const phoneIso = findIsoForDial(phoneCc) || DEFAULT_ISO;
  let countryNm = user.country != null ? String(user.country).trim() : "";
  const stateNm = user.state != null ? String(user.state) : "";
  const cityNm = user.city != null ? String(user.city) : "";
  let countryIso = findIsoForCountryName(countryNm);
  if (!countryNm) {
    countryIso = DEFAULT_ISO;
    countryNm = DEFAULT_COUNTRY_NAME;
  }
  const stateCode = countryIso ? findStateCodeForName(countryIso, stateNm) : "";
  const waCc =
    user.whatsappCountryCode != null ? String(user.whatsappCountryCode).trim() : DEFAULT_DIAL;
  const waIso = findIsoForDial(waCc) || phoneIso;
  return {
    name: sanitizePersonName(user.name != null ? String(user.name) : ""),
    email: user.email != null ? String(user.email) : "",
    password: "",
    phoneCountryIso: phoneIso,
    phoneCountryCode: phoneCc,
    phone: user.phone != null ? String(user.phone) : "",
    whatsappSameAsMobile: Boolean(user.whatsappSameAsMobile),
    whatsappCountryIso: waIso,
    whatsappCountryCode: waCc,
    whatsappPhone: user.whatsappPhone != null ? String(user.whatsappPhone) : "",
    dob,
    gender: GENDER_VALUES.includes(user.gender) ? user.gender : "boy",
    countryIso,
    country: countryNm,
    stateCode,
    state: stateNm,
    city: cityNm,
    primaryHealthConcern: phcStr,
    termsAccepted: Boolean(user.termsAccepted),
    fcm_id: user.fcm_id != null ? String(user.fcm_id) : "",
    status: ["active", "inactive", "blocked"].includes(user.status) ? user.status : "active",
  };
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Blocked" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "guess", label: "Prefer not to say" },
];

function yearsAgoDate(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/** Letters (any script), spaces, apostrophe, hyphen, period — strips digits and other symbols. */
function sanitizePersonName(raw) {
  const collapsed = String(raw ?? "").replace(/\s{2,}/g, " ");
  return collapsed.replace(/[^\p{L}\s'.\-]/gu, "");
}

const NAME_ALLOWED_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;

function validateUserForm(values) {
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const cc = values.phoneCountryCode.trim();

  if (!name || name.length < 2) return "Full name is required (at least 2 characters).";
  if (/\d/.test(name)) return "Name cannot contain numbers.";
  if (!NAME_ALLOWED_PATTERN.test(name)) {
    return "Name may only contain letters, spaces, hyphens (-), apostrophes ('), and periods (.).";
  }
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (!phone) return "Mobile number is required.";
  if (!values.gender) return "Gender is required.";
  if (!values.status) return "Account status is required.";

  if (!/^\d+$/.test(phone)) return "Mobile number should contain digits only.";
  if (phone.length !== 10) return "Mobile number must be exactly 10 digits.";
  if (!cc) return "Phone country code is required.";

  if (!values.whatsappSameAsMobile) {
    const wa = values.whatsappPhone.trim();
    if (!wa) return "WhatsApp number is required when not same as mobile.";
    if (!/^\d+$/.test(wa)) return "WhatsApp number should contain digits only.";
    if (wa.length !== 10) return "WhatsApp number must be exactly 10 digits.";
    if (!values.whatsappCountryCode.trim()) return "WhatsApp country code is required.";
  }

  if (values.dob) {
    const dob = new Date(values.dob);
    if (Number.isNaN(dob.getTime())) return "Please select a valid date of birth.";
    const latestAllowed = yearsAgoDate(5);
    const oldestAllowed = yearsAgoDate(100);
    if (dob > latestAllowed) return "User must be at least 5 years old.";
    if (dob < oldestAllowed) return "User age cannot be more than 100 years.";
  }

  return "";
}

function validateUserFormForMode(values, mode) {
  const baseErr = validateUserForm(values);
  if (baseErr) return baseErr;
  if (mode === "create" && !values.termsAccepted) {
    return "You must accept the terms and conditions.";
  }
  return "";
}

function buildApiPayload(values, { includeTermsAccepted = true } = {}) {
  const sameWa = Boolean(values.whatsappSameAsMobile);
  const base = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phoneCountryCode: values.phoneCountryCode.trim() || DEFAULT_DIAL,
    phone: values.phone.trim(),
    whatsappSameAsMobile: sameWa,
    whatsappCountryCode: sameWa
      ? values.phoneCountryCode.trim() || DEFAULT_DIAL
      : values.whatsappCountryCode.trim() || DEFAULT_DIAL,
    whatsappPhone: sameWa ? values.phone.trim() : values.whatsappPhone.trim() || null,
    dob: values.dob || "",
    gender: values.gender,
    country: values.country.trim(),
    state: values.state.trim(),
    city: values.city.trim(),
    primaryHealthConcern: values.primaryHealthConcern.trim(),
    fcm_id: values.fcm_id.trim(),
    status: values.status,
  };
  if (includeTermsAccepted) {
    base.termsAccepted = Boolean(values.termsAccepted);
  }
  if (values.password && String(values.password).trim()) {
    base.password = String(values.password).trim();
  }
  return base;
}

function buildPatchPayload(values, initialUser) {
  const next = buildApiPayload(values, { includeTermsAccepted: false });
  const patch = {};
  const initial = initialUser ? userToFormValues(initialUser) : null;
  if (!initial) return next;
  for (const key of Object.keys(next)) {
    if (key === "password" && !next.password) continue;
    const a = next[key];
    const b = initial[key];
    if (key === "dob") {
      const an = a === "" ? "" : a;
      const bn = b === "" ? "" : b;
      if (an !== bn) patch[key] = a === "" ? null : a;
      continue;
    }
    if (key === "primaryHealthConcern") {
      const an = String(a || "").trim();
      const bn = String(b || "").trim();
      if (an !== bn) patch[key] = an === "" ? "" : an;
      continue;
    }
    if (key === "whatsappPhone") {
      const an = a == null || a === "" ? "" : String(a);
      const bn = b == null || b === "" ? "" : String(b);
      if (an !== bn) patch[key] = a;
      continue;
    }
    if (a !== b) patch[key] = a;
  }
  return patch;
}

export function UserProfileForm({
  mode = "create",
  userId = "",
  initialUser = null,
  onCancel,
  onSuccess,
  submitLabel = "Save Changes",
}) {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [values, setValues] = useState(() => (initialUser ? userToFormValues(initialUser) : emptyUserForm()));
  const [healthConcerns, setHealthConcerns] = useState([]);
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputId = useId();

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { healthConcerns: rows } = await adminListHealthConcerns(adminToken, { status: "active", limit: 200 });
        if (!cancelled) setHealthConcerns(rows);
      } catch (e) {
        if (e?.status === 401) dispatch(logout());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch]);

  useEffect(() => {
    if (!initialUser) {
      setValues(emptyUserForm());
      return;
    }
    setValues(userToFormValues(initialUser));
    setProfileFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialUser]);

  useEffect(() => {
    if (!profileFile) return;
    const url = URL.createObjectURL(profileFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  useEffect(() => {
    if (!values.whatsappSameAsMobile) return;
    setValues((p) => {
      const wcc = (p.phoneCountryCode || "").trim() || DEFAULT_DIAL;
      const wp = (p.phone || "").trim();
      const wIso = p.phoneCountryIso || DEFAULT_ISO;
      if (
        p.whatsappCountryCode === wcc &&
        p.whatsappPhone === wp &&
        p.whatsappCountryIso === wIso
      ) {
        return p;
      }
      return { ...p, whatsappCountryCode: wcc, whatsappPhone: wp, whatsappCountryIso: wIso };
    });
  }, [values.whatsappSameAsMobile, values.phone, values.phoneCountryCode, values.phoneCountryIso]);

  const dialCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={c.isoCode} value={c.isoCode}>
          {c.name} ({dialCodeFromPhonecode(c.phonecode)})
        </option>
      )),
    [],
  );

  const nameCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={`loc-${c.isoCode}`} value={c.isoCode}>
          {c.name}
        </option>
      )),
    [],
  );

  const setPhoneCountryIso = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setValues((p) => ({
      ...p,
      phoneCountryIso: code,
      phoneCountryCode: c ? dialCodeFromPhonecode(c.phonecode) : DEFAULT_DIAL,
    }));
  };

  const setWhatsappCountryIso = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setValues((p) => ({
      ...p,
      whatsappCountryIso: code,
      whatsappCountryCode: c ? dialCodeFromPhonecode(c.phonecode) : DEFAULT_DIAL,
    }));
  };

  const setLocationCountryIso = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setValues((p) => ({
      ...p,
      countryIso: code,
      country: c?.name ?? DEFAULT_COUNTRY_NAME,
      stateCode: "",
      state: "",
      city: "",
    }));
  };

  const locationOptions = useMemo(() => {
    const iso = values.countryIso;
    if (!iso) return { states: [], cities: [], citiesFromCountry: false };
    const states = State.getStatesOfCountry(iso) || [];
    if (states.length === 0) {
      const cities = City.getCitiesOfCountry(iso) || [];
      return { states: [], cities, citiesFromCountry: true };
    }
    const cities = values.stateCode ? City.getCitiesOfState(iso, values.stateCode) || [] : [];
    return { states, cities, citiesFromCountry: false };
  }, [values.countryIso, values.stateCode]);

  const handleChange = (field) => (e) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [field]: v }));
  };

  const handleNameInput = (e) => {
    setValues((prev) => ({ ...prev, name: sanitizePersonName(e.target.value) }));
  };

  const handlePhoneInput = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setValues((prev) => ({ ...prev, phone: onlyDigits }));
  };

  const handleWhatsappPhoneInput = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setValues((prev) => ({ ...prev, whatsappPhone: onlyDigits }));
  };

  /** Block non-digit character keys in phone fields (paste still normalized in onChange). */
  const handlePhoneKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  };

  const handleNameKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setFormError("");
  };

  const clearFile = () => {
    setProfileFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const avatarDisplay = previewUrl || mediaUrl(initialUser?.profileImage);
  const initial = (values.name || values.email || "?").charAt(0).toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!adminToken) {
      const msg = "You are not signed in.";
      setFormError(msg);
      await Swal.fire({ icon: "error", title: "Validation error", text: msg });
      return;
    }
    const validationError = validateUserFormForMode(values, mode);
    if (validationError) {
      setFormError(validationError);
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    setSubmitting(true);
    try {
      let user;
      if (mode === "create") {
        const payload = buildApiPayload(values);
        user = await adminCreateUser(adminToken, payload, profileFile);
      } else {
        const patchPayload = buildPatchPayload(values, initialUser);
        const hasPatch = Object.keys(patchPayload).length > 0;
        user = await adminUpdateUser(adminToken, userId, hasPatch ? patchPayload : {}, profileFile);
      }
      onSuccess?.(user);
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logout());
        return;
      }
      const msg = err.message || "Request failed.";
      setFormError(msg);
      await Swal.fire({ icon: "error", title: "Request failed", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const waSynced = values.whatsappSameAsMobile;
  const whatsappPhoneDisplay = waSynced ? values.phone : values.whatsappPhone;

  return (
    <form className="user-profile-form" onSubmit={handleSubmit}>
      {formError ? (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="d-flex flex-column flex-sm-row align-items-start gap-3 gap-sm-4 pb-4 mb-4 border-bottom">
        <div className="position-relative flex-shrink-0">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            className="d-none"
            onChange={handleFile}
          />
          <label htmlFor={fileInputId} className="mb-0 d-block" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle border border-2 overflow-hidden bg-body-secondary d-flex align-items-center justify-content-center position-relative shadow-sm"
              style={{ width: 112, height: 112 }}
            >
              {avatarDisplay ? (
                <img src={avatarDisplay} alt="" className="w-100 h-100 object-fit-cover" width={112} height={112} />
              ) : (
                <>
                  <span className="fs-2 fw-medium text-secondary user-select-none">{initial}</span>
                  <span className="position-absolute bottom-0 start-50 translate-middle-x badge rounded-pill bg-primary px-2 py-1 mb-1 small">
                    Photo
                  </span>
                </>
              )}
            </div>
            <div className="text-center small text-primary mt-2">Choose image</div>
          </label>
        </div>
        <div className="flex-grow-1 pt-sm-1">
          <div className="fw-semibold mb-1">Profile image</div>
          <p className="text-body-secondary small mb-2 mb-sm-3">Optional. JPEG, PNG, GIF, or WebP.</p>
          {profileFile ? (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFile}>
              Remove new image
            </button>
          ) : null}
        </div>
      </div>

      <p className="small text-uppercase text-body-secondary fw-semibold mb-3">Basic details</p>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label htmlFor={`${fileInputId}-name`} className="form-label">
            Full name <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id={`${fileInputId}-name`}
            type="text"
            className="form-control"
            value={values.name}
            onChange={handleNameInput}
            onKeyDown={handleNameKeyDown}
            placeholder="Full name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            inputMode="text"
            autoCapitalize="words"
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${fileInputId}-email`} className="form-label">
            Email <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id={`${fileInputId}-email`}
            type="email"
            className="form-control"
            value={values.email}
            onChange={handleChange("email")}
            placeholder="email@example.com"
            autoComplete="email"
            minLength={3}
            maxLength={120}
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${fileInputId}-dob`} className="form-label">
            Date of birth <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id={`${fileInputId}-dob`}
            type="date"
            className="form-control"
            value={values.dob}
            onChange={handleChange("dob")}
            min={yearsAgoDate(100).toISOString().slice(0, 10)}
            max={yearsAgoDate(5).toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${fileInputId}-gender`} className="form-label">
            Gender <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id={`${fileInputId}-gender`}
            className="form-select"
            value={values.gender}
            onChange={handleChange("gender")}
            required
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="small text-uppercase text-body-secondary fw-semibold mb-3">Contact</p>
      <div className="row g-3 mb-3 align-items-start">
        <div className="col-12">
          <div className="form-check mb-1">
            <input
              type="checkbox"
              className="form-check-input"
              checked={values.whatsappSameAsMobile}
              onChange={(e) => {
                const checked = e.target.checked;
                setValues((p) => {
                  if (checked) {
                    const wcc = (p.phoneCountryCode || "").trim() || DEFAULT_DIAL;
                    return {
                      ...p,
                      whatsappSameAsMobile: true,
                      whatsappCountryCode: wcc,
                      whatsappCountryIso: p.phoneCountryIso || DEFAULT_ISO,
                      whatsappPhone: (p.phone || "").trim(),
                    };
                  }
                  return {
                    ...p,
                    whatsappSameAsMobile: false,
                    whatsappCountryIso: p.whatsappCountryIso || p.phoneCountryIso || DEFAULT_ISO,
                    whatsappCountryCode:
                      (p.whatsappCountryCode || "").trim() || (p.phoneCountryCode || "").trim() || DEFAULT_DIAL,
                    whatsappPhone: (p.whatsappPhone || "").trim() || (p.phone || "").trim(),
                  };
                });
              }}
              id={`${fileInputId}-wa-same`}
            />
            <label className="form-check-label" htmlFor={`${fileInputId}-wa-same`}>
              WhatsApp same as mobile
            </label>
          </div>
        </div>

        <div className="col-12 col-md-6 min-w-0">
          <label className="form-label" htmlFor={`${fileInputId}-phone-national`}>
            Mobile number <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <div className="input-group flex-nowrap">
            <select
              className="form-select flex-shrink-0"
              style={{ width: "9.5rem", maxWidth: "42%" }}
              value={values.phoneCountryIso || DEFAULT_ISO}
              onChange={(e) => setPhoneCountryIso(e.target.value)}
              aria-label="Country calling code"
              autoComplete="tel-country-code"
              disabled
              aria-readOnly={true}
            >
              {dialCountryOptions}
            </select>
            <input
              id={`${fileInputId}-phone-national`}
              type="tel"
              className="form-control min-w-0"
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
          <div className="form-text">10-digit number without country code.</div>
        </div>

        <div className="col-12 col-md-6 min-w-0">
          <label className="form-label" htmlFor={`${fileInputId}-wa-national`}>
            WhatsApp number
            {!waSynced ? <span className="text-danger" aria-hidden="true"> *</span> : null}
          </label>
          <div className="input-group flex-nowrap">
            <select
              className="form-select flex-shrink-0"
              style={
                waSynced
                  ? { width: "9.5rem", maxWidth: "42%", opacity: 0.85, cursor: "not-allowed" }
                  : { width: "9.5rem", maxWidth: "42%" }
              }
              value={waSynced ? values.phoneCountryIso || DEFAULT_ISO : values.whatsappCountryIso || DEFAULT_ISO}
              onChange={waSynced ? undefined : (e) => setWhatsappCountryIso(e.target.value)}
              disabled
              required={!waSynced}
              aria-label="WhatsApp country calling code"
              aria-readOnly={true}
            >
              {dialCountryOptions}
            </select>
            <input
              id={`${fileInputId}-wa-national`}
              type="tel"
              className="form-control min-w-0"
              value={whatsappPhoneDisplay}
              onChange={waSynced ? () => {} : handleWhatsappPhoneInput}
              onKeyDown={waSynced ? undefined : handlePhoneKeyDown}
              readOnly={waSynced}
              placeholder="9876543210"
              required={!waSynced}
              inputMode="numeric"
              pattern={!waSynced ? "[0-9]{10}" : undefined}
              aria-label="WhatsApp number without country code"
              minLength={!waSynced ? 10 : undefined}
              maxLength={10}
              style={waSynced ? { opacity: 0.85, cursor: "not-allowed" } : undefined}
              aria-readOnly={waSynced}
            />
          </div>
          <div className="form-text">
            {waSynced ? "Matches mobile number." : "10-digit number without country code."}
          </div>
        </div>
      </div>

      <p className="small text-uppercase text-body-secondary fw-semibold mb-3 mt-2 mt-md-4">Location</p>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <label htmlFor={`${fileInputId}-country`} className="form-label">
            Country <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id={`${fileInputId}-country`}
            className="form-select text-muted"
            disabled
            required
            aria-readOnly={true}
            value={values.countryIso || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setLocationCountryIso(v);
            }}
          >
            {!values.countryIso ? (
              <option value="" disabled>
                Select country
              </option>
            ) : null}
            {nameCountryOptions}
          </select>
        </div>
        <div className="col-md-4">
          <label htmlFor={`${fileInputId}-state`} className="form-label">
            State / region <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            required
            id={`${fileInputId}-state`}
            className="form-select"
            value={values.stateCode || ""}
            disabled={!values.countryIso || locationOptions.citiesFromCountry}
            onChange={(e) => {
              const sc = e.target.value;
              const st =
                values.countryIso && sc
                  ? (State.getStatesOfCountry(values.countryIso) || []).find((s) => s.isoCode === sc)
                  : null;
              setValues((p) => ({
                ...p,
                stateCode: sc,
                state: st?.name ?? "",
                city: "",
              }));
            }}
          >
            <option value="">
              {!values.countryIso
                ? "Select country first"
                : locationOptions.citiesFromCountry
                  ? "No states — pick city below"
                  : "Select state"}
            </option>
            {locationOptions.states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label htmlFor={`${fileInputId}-city`} className="form-label">
            City <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id={`${fileInputId}-city`}
            className="form-select"
            value={values.city || ""}
            disabled={
              !values.countryIso ||
              (!locationOptions.citiesFromCountry && !values.stateCode && locationOptions.states.length > 0)
            }
            onChange={(e) => setValues((p) => ({ ...p, city: e.target.value }))}
            required
          >
            <option value="">
              {!values.countryIso
                ? "Select country first"
                : !locationOptions.citiesFromCountry && !values.stateCode && locationOptions.states.length > 0
                  ? "Select state first"
                  : "Select city"}
            </option>
            {locationOptions.cities.map((ct) => (
              <option key={`${ct.countryCode}-${ct.stateCode}-${ct.name}`} value={ct.name}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="small text-uppercase text-body-secondary fw-semibold mb-3">Account & preferences</p>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <label htmlFor={`${fileInputId}-phc`} className="form-label">
            Primary health concern <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id={`${fileInputId}-phc`}
            className="form-select"
            value={values.primaryHealthConcern}
            onChange={handleChange("primaryHealthConcern")}
            required
          >
            <option value="" disabled>Select primary health concern</option>
            {healthConcerns.map((h) => (
              <option key={h._id} value={h._id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor={`${fileInputId}-status`} className="form-label">
            Account status <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id={`${fileInputId}-status`}
            className="form-select"
            value={values.status}
            onChange={handleChange("status")}
            required
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12">
          {mode === "edit" ? (
            <div>
              <span className="form-label d-block">Terms &amp; conditions</span>
              <div className="border rounded px-3 py-2 bg-body-tertiary small">
                <div className="fw-medium">
                  {values.termsAccepted ? "Accepted" : "Not accepted"}
                </div>
                {initialUser?.termsAcceptedAt ? (
                  <div className="text-body-secondary mt-1">
                    Recorded:{" "}
                    {new Date(initialUser.termsAcceptedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                ) : null}
                {/* <div className="text-body-secondary mt-2 mb-0">
                  This cannot be changed when editing a user.
                </div> */}
              </div>
            </div>
          ) : (
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={values.termsAccepted}
                onChange={(e) => setValues((p) => ({ ...p, termsAccepted: e.target.checked }))}
                id={`${fileInputId}-terms`}
                required
              />
              <label className="form-check-label" htmlFor={`${fileInputId}-terms`}>
                I accept the terms and conditions <span className="text-danger" aria-hidden="true">*</span>
              </label>
            </div>
          )}
        </div>
        {mode === "edit" ? (
          <div className="col-12 col-md-6">
            <label htmlFor={`${fileInputId}-pwd`} className="form-label">
              New password <span className="text-body-secondary fw-normal">(optional)</span>
            </label>
            <input
              id={`${fileInputId}-pwd`}
              type="password"
              className="form-control"
              value={values.password}
              onChange={handleChange("password")}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
        ) : null}
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-end pt-3 border-top">
        <button type="button" className="btn btn-outline-secondary px-4" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary px-4 d-inline-flex align-items-center gap-2" disabled={submitting}>
          {submitting ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
          )}
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function UserAdd() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      <div className="d-flex flex-wrap align-items-start gap-3 mb-4">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm rounded-circle p-2 lh-1 mt-1"
          aria-label="Back"
          title="Back"
          onClick={() => navigate(-1)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <h1 className="h3 fw-semibold mb-1">Add user</h1>
          <p className="text-body-secondary mb-0">Create a new user account and profile.</p>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-lg-5">
          <UserProfileForm
            mode="create"
            submitLabel="Create user"
            onCancel={() => navigate(-1)}
            onSuccess={async () => {
              await Swal.fire({
                icon: "success",
                title: "User created",
                timer: 1500,
              });
              navigate(-1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
