import Country from "country-state-city/lib/country.js";
import State from "country-state-city/lib/state.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminListHealthConcerns } from "../api/healthConcernApi.js";
import { createUser, GENDER_UI_OPTIONS } from "../api/usersApi.js";
import { PHONE_COUNTRY_OPTIONS, INDIA_STATE_CITIES, phoneLengthForDial } from "../data/indiaLocations.js";
import {
  DOB_MAX_AGE_YEARS,
  DOB_MIN_AGE_YEARS,
  EMAIL_MAX_LEN,
  PERSON_NAME_MAX_LEN,
  PINCODE_LEN,
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  maxAllowedDobIso,
  minAllowedDobIso,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
  sanitizePincode,
  validateDateOfBirth,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
  validatePincode,
} from "../utils/personFieldValidation.js";

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Disabled" },
];

const LOCATION_MENU_LIMIT = 5;
const ALL_COUNTRIES = [...Country.getAllCountries()].sort((a, b) => a.name.localeCompare(b.name));
const COUNTRY_SEARCH_OPTIONS = ALL_COUNTRIES.map((country) => ({
  value: country.isoCode,
  label: country.name,
}));

function dialFromPhonecode(phonecode) {
  const raw = String(phonecode ?? "").trim().replace(/\s+/g, "");
  if (!raw) return "+91";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function SearchableLocationSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  emptyMessage = "No matches. Type to search.",
}) {
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState(null);

  const selected = options.find((row) => row.value === value) || null;
  const inputValue = open && searching ? query : (selected?.label || "");
  const matches = useMemo(() => {
    const needle = (open && searching ? query : "").trim().toLowerCase();
    if (!needle) return options;
    return options.filter((row) => row.label.toLowerCase().includes(needle));
  }, [options, open, query, searching]);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setMenuPos(null);
      return undefined;
    }
    function place() {
      const el = wrapRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      setMenuPos({ top: box.bottom + 4, left: box.left, width: box.width });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [disabled, open, matches.length]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      const target = event.target;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setSearching(false);
      setQuery("");
    }
    function onPageScroll(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
      setSearching(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("scroll", onPageScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("scroll", onPageScroll, true);
    };
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.children[activeIndex];
    if (!list || !active) return;
    const listBox = list.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();
    if (itemBox.bottom > listBox.bottom) list.scrollTop += itemBox.bottom - listBox.bottom;
    else if (itemBox.top < listBox.top) list.scrollTop -= listBox.top - itemBox.top;
  }, [activeIndex, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [open, query]);

  function closeMenu() {
    setOpen(false);
    setSearching(false);
    setQuery("");
  }

  function choose(row) {
    onChange(row);
    closeMenu();
  }

  function onKeyDown(event) {
    if (disabled) return;
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    }
  }

  const menu = open && !disabled && menuPos
    ? createPortal(
        <div
          ref={menuRef}
          className="ua-create-user__suggest"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          role="listbox"
        >
          {matches.length ? (
            <div ref={listRef} className="ua-create-user__suggest-list" role="presentation">
              {matches.map((row, index) => (
                <button
                  type="button"
                  key={`${row.value}-${index}`}
                  className={`ua-create-user__suggest-item${index === activeIndex ? " is-active" : ""}${row.value === value ? " is-selected" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(row)}
                  role="option"
                  aria-selected={row.value === value}
                >
                  {row.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="ua-create-user__suggest-empty">{emptyMessage}</div>
          )}
          {matches.length > LOCATION_MENU_LIMIT ? (
            <div className="ua-create-user__suggest-more">
              Scroll to see more, or type to search.
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="ua-create-user__combo" ref={wrapRef}>
      <input
        className="ua-create-user__input ua-create-user__combo-input"
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(event) => {
          setSearching(true);
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {menu}
    </div>
  );
}

function emptyForm() {
  return {
    name: "",
    email: "",
    dob: maxAllowedDobIso(),
    gender: "male",
    whatsappSameAsMobile: true,
    phoneCountryCode: "+91",
    phone: "",
    whatsappCountryCode: "+91",
    whatsappPhone: "",
    country: "",
    countryIso: "",
    state: "",
    stateIso: "",
    city: "",
    pincode: "",
    primaryHealthConcern: "",
    primaryHealthConcernOther: "",
    referralCode: "",
    status: "active",
    termsAccepted: true,
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
  const imagePreviewRef = useRef("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [concerns, setConcerns] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const indiaSelected = form.countryIso === "IN" || form.country === "India";
  const phoneLen = phoneLengthForDial(form.phoneCountryCode);
  const waLen = phoneLengthForDial(form.whatsappSameAsMobile ? form.phoneCountryCode : form.whatsappCountryCode);
  const states = useMemo(
    () => (form.countryIso ? State.getStatesOfCountry(form.countryIso) : []),
    [form.countryIso],
  );
  const cities = useMemo(() => {
    if (form.countryIso !== "IN" || !form.state) return [];
    return (INDIA_STATE_CITIES[form.state] || []).map((name) => ({ name }));
  }, [form.countryIso, form.state]);
  const stateOptions = useMemo(
    () => states.map((state) => ({ value: state.isoCode, label: state.name })),
    [states],
  );
  const cityOptions = useMemo(
    () => cities.map((city) => ({ value: city.name, label: city.name })),
    [cities],
  );
  const phoneCountryOptions = useMemo(() => {
    const options = [...PHONE_COUNTRY_OPTIONS];
    const used = new Set(options.map((opt) => opt.dial));
    for (const dial of [form.phoneCountryCode, form.whatsappCountryCode]) {
      if (!dial || used.has(dial)) continue;
      used.add(dial);
      const match = ALL_COUNTRIES.find((country) => dialFromPhonecode(country.phonecode) === dial);
      options.push({
        iso: match?.isoCode || dial,
        dial,
        label: match ? `${match.name} (${dial})` : dial,
      });
    }
    return options;
  }, [form.phoneCountryCode, form.whatsappCountryCode]);
  const showOtherConcern = isOtherConcern(concerns, form.primaryHealthConcern);

  useEffect(() => {
    if (!open) return undefined;
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }
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
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
        imagePreviewRef.current = "";
      }
    };
  }, []);

  if (!open) return null;

  function patch(next) {
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (merged.whatsappSameAsMobile) {
        merged.whatsappCountryCode = merged.phoneCountryCode;
        merged.whatsappPhone = merged.phone;
      } else if (prev.whatsappSameAsMobile) {
        merged.whatsappPhone = "";
        merged.whatsappCountryCode = merged.phoneCountryCode;
      }
      return merged;
    });
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const typeOk = IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
    if (!typeOk) {
      onToast?.("Use JPEG, PNG, GIF, or WebP");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      onToast?.("Profile image must be 25 MB or smaller");
      return;
    }
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const previewUrl = URL.createObjectURL(file);
    imagePreviewRef.current = previewUrl;
    setImageFile(file);
    setImagePreview(previewUrl);
  }

  function validate() {
    const next = {};
    const nameErr = validatePersonName(sanitizePersonName(form.name).trim());
    if (nameErr) next.name = nameErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) next.email = emailErr;
    const dobErr = validateDateOfBirth(form.dob, { required: true });
    if (dobErr) next.dob = dobErr;
    if (!form.gender) next.gender = "Gender is required.";
    const phoneErr = validatePhoneDigits(form.phone, { countryCode: form.phoneCountryCode });
    if (phoneErr) next.phone = phoneErr;
    if (!form.whatsappSameAsMobile) {
      const waErr = validatePhoneDigits(form.whatsappPhone, {
        label: "WhatsApp number",
        countryCode: form.whatsappCountryCode,
      });
      if (waErr) next.whatsappPhone = waErr;
    }
    if (!form.country) next.country = "Country is required.";
    if (!String(form.state || "").trim()) next.state = "State / region is required.";
    if (!String(form.city || "").trim()) next.city = "City is required.";
    const pinErr = validatePincode(form.pincode, { country: form.country || "India" });
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
      name: sanitizePersonName(form.name).trim(),
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

  const modal = (
    <div className="ua-create-user-backdrop" role="presentation">
      <div
        className="ua-create-user"
        onClick={(e) => e.stopPropagation()}
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

        <form className="ua-create-user__form" onSubmit={submit}>
        <div className="ua-create-user__body">
          {submitError ? <div className="ua-create-user__banner">{submitError}</div> : null}

          <div className="ua-create-user__photo">
            <button
              type="button"
              className={`ua-create-user__avatar${imagePreview ? " has-photo" : ""}`}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Choose profile image"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Selected profile" />
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
            <Field
              label="Date of birth"
              required
              hint={`Must be at least ${DOB_MIN_AGE_YEARS} years ago and within ${DOB_MAX_AGE_YEARS} years.`}
              error={errors.dob}
            >
              <input
                className="ua-create-user__input"
                type="date"
                value={form.dob}
                min={minAllowedDobIso()}
                max={maxAllowedDobIso()}
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.value;
                  const dobMax = maxAllowedDobIso();
                  const dobMin = minAllowedDobIso();
                  let safe = next;
                  if (safe && safe > dobMax) safe = dobMax;
                  if (safe && safe < dobMin) safe = dobMin;
                  patch({ dob: safe });
                }}
              />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select
                className="ua-create-user__input"
                value={form.gender}
                disabled={busy}
                onChange={(e) => patch({ gender: e.target.value })}
              >
                {GENDER_UI_OPTIONS.map((opt) => (
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
              hint={
                form.phoneCountryCode === "+91"
                  ? "10-digit Indian mobile (must start with 6, 7, 8, or 9)."
                  : `${phoneLen}-digit mobile number for the selected country.`
              }
              error={errors.phone}
            >
              <div className="ua-create-user__phone">
                <select
                  className="ua-create-user__input ua-create-user__dial"
                  value={form.phoneCountryCode}
                  disabled={busy}
                  onChange={(e) => patch({ phoneCountryCode: e.target.value, phone: "" })}
                >
                  {phoneCountryOptions.map((opt) => (
                    <option key={`${opt.iso}-${opt.dial}`} value={opt.dial}>{opt.label}</option>
                  ))}
                </select>
                <input
                  className="ua-create-user__input"
                  inputMode="numeric"
                  placeholder={form.phoneCountryCode === "+91" ? "9876543210" : "Mobile number"}
                  maxLength={phoneLen}
                  value={form.phone}
                  disabled={busy}
                  onKeyDown={form.phoneCountryCode === "+91" ? blockIndianMobileFirstDigitKeyDown : blockPhoneNonDigitKeyDown}
                  onChange={(e) => patch({ phone: sanitizePhoneDigits(e.target.value, phoneLen) })}
                />
              </div>
            </Field>
            <Field
              label="WhatsApp number"
              required
              hint={
                form.whatsappSameAsMobile
                  ? "Matches mobile number."
                  : form.whatsappCountryCode === "+91"
                    ? "10-digit Indian mobile (must start with 6, 7, 8, or 9)."
                    : `${waLen}-digit WhatsApp number for the selected country.`
              }
              error={errors.whatsappPhone}
            >
              <div className="ua-create-user__phone">
                <select
                  className="ua-create-user__input ua-create-user__dial"
                  value={form.whatsappSameAsMobile ? form.phoneCountryCode : form.whatsappCountryCode}
                  disabled={busy || form.whatsappSameAsMobile}
                  onChange={(e) => patch({ whatsappCountryCode: e.target.value, whatsappPhone: "" })}
                >
                  {phoneCountryOptions.map((opt) => (
                    <option key={`wa-${opt.iso}-${opt.dial}`} value={opt.dial}>{opt.label}</option>
                  ))}
                </select>
                <input
                  className="ua-create-user__input"
                  inputMode="numeric"
                  placeholder={form.phoneCountryCode === "+91" ? "9876543210" : "WhatsApp number"}
                  maxLength={form.whatsappSameAsMobile ? phoneLen : waLen}
                  value={form.whatsappSameAsMobile ? form.phone : form.whatsappPhone}
                  disabled={busy || form.whatsappSameAsMobile}
                  onKeyDown={
                    (form.whatsappSameAsMobile ? form.phoneCountryCode : form.whatsappCountryCode) === "+91"
                      ? blockIndianMobileFirstDigitKeyDown
                      : blockPhoneNonDigitKeyDown
                  }
                  onChange={(e) => patch({
                    whatsappPhone: sanitizePhoneDigits(
                      e.target.value,
                      form.whatsappSameAsMobile ? phoneLen : waLen,
                    ),
                  })}
                />
              </div>
            </Field>
          </div>

          <div className="ua-create-user__section">LOCATION</div>
          <div className="ua-create-user__grid">
            <Field label="Country" required error={errors.country}>
              <SearchableLocationSelect
                options={COUNTRY_SEARCH_OPTIONS}
                value={form.countryIso}
                disabled={busy}
                placeholder="Search country"
                onChange={(option) => {
                  if (!option) return;
                  const selected = Country.getCountryByCode(option.value);
                  const dial = dialFromPhonecode(selected?.phonecode);
                  patch({
                    countryIso: option.value,
                    country: selected?.name || option.label,
                    state: "",
                    stateIso: "",
                    city: "",
                    pincode: "",
                    phoneCountryCode: dial,
                    whatsappCountryCode: dial,
                    phone: "",
                    whatsappPhone: "",
                  });
                }}
              />
            </Field>
            <Field label="State / region" required error={errors.state}>
              {stateOptions.length > 0 ? (
                <SearchableLocationSelect
                  key={form.countryIso}
                  options={stateOptions}
                  value={form.stateIso}
                  disabled={busy || !form.countryIso}
                  placeholder={form.countryIso ? "Search state / region" : "Select country first"}
                  onChange={(option) => {
                    if (!option) return;
                    patch({ stateIso: option.value, state: option.label, city: "" });
                  }}
                />
              ) : (
                <input
                  className="ua-create-user__input"
                  placeholder={form.countryIso ? "State / region" : "Select country first"}
                  value={form.state}
                  disabled={busy || !form.countryIso}
                  onChange={(e) => patch({ state: e.target.value, stateIso: "" })}
                />
              )}
            </Field>
            <Field label="City" required error={errors.city}>
              {cityOptions.length > 0 ? (
                <SearchableLocationSelect
                  key={`${form.countryIso}-${form.stateIso}`}
                  options={cityOptions}
                  value={form.city}
                  disabled={busy || !form.countryIso || (states.length > 0 && !form.stateIso)}
                  placeholder={
                    states.length > 0 && !form.stateIso ? "Select state first" : "Search city"
                  }
                  onChange={(option) => {
                    if (!option) return;
                    patch({ city: option.value });
                  }}
                />
              ) : (
                <input
                  className="ua-create-user__input"
                  placeholder={
                    !form.countryIso
                      ? "Select country first"
                      : states.length > 0 && !form.stateIso
                        ? "Select state first"
                        : "City"
                  }
                  value={form.city}
                  disabled={busy || !form.countryIso || (states.length > 0 && !form.stateIso)}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              )}
            </Field>
            <Field
              label={indiaSelected ? "Pin code" : "Postal code"}
              required
              hint={indiaSelected ? "6-digit Indian PIN code." : "3–12 characters, letters or digits."}
              error={errors.pincode}
            >
              <input
                className="ua-create-user__input"
                inputMode={indiaSelected ? "numeric" : "text"}
                placeholder={indiaSelected ? "400001" : "Postal code"}
                maxLength={indiaSelected ? PINCODE_LEN : 12}
                value={form.pincode}
                disabled={busy}
                onKeyDown={indiaSelected ? blockPhoneNonDigitKeyDown : undefined}
                onChange={(e) => patch({
                  pincode: indiaSelected
                    ? sanitizePincode(e.target.value, PINCODE_LEN).replace(/\D/g, "")
                    : sanitizePincode(e.target.value, 12),
                })}
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
              hint="Optional. Example 7WDW4JST — assigns that Wellness Coach after create / consultancy payment."
            >
              <input
                className="ua-create-user__input"
                placeholder="7WDW4JST"
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
          {/* <label className={`ua-create-user__check${errors.termsAccepted ? " ua-create-user__check--error" : ""}`}>
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
          {errors.termsAccepted ? <div className="ua-create-user__error">{errors.termsAccepted}</div> : null} */}
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
    </div>
  );

  const root = document.querySelector(".updated-admin") || document.body;
  return createPortal(modal, root);
}
