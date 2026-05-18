import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Country, State } from "country-state-city";
import {
  adminCreateWellnessCoach,
  adminUpdateWellnessCoach,
  buildCoachPayload,
  buildCoachUpdatePayload,
  resolveCoachId,
} from "../../api/adminWellnessCoaches.js";
import {
  adminGetSpecializationById,
  adminListSpecializations,
} from "../../api/adminSpecializations.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { logout } from "../../store/authSlice.js";
import {
  ALL_COUNTRIES,
  BIO_MAX_LEN,
  DEFAULT_ISO,
  getSpecializationOptionId,
  NAME_MAX_LEN,
  STATUS_OPTIONS,
  coachToForm,
  dialCodeFromPhonecode,
  emptyCoachForm,
  getLocationOptions,
  validateCoachForm,
} from "./WellnessCoachShared.js";
import { WellnessCoachSubmitLoader } from "./WellnessCoachPageLoader.jsx";

export function WellnessCoachForm({
  mode = "create",
  coachId = "",
  initialCoach = null,
  onCancel,
  onSuccess,
  submitLabel = "Save",
}) {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [values, setValues] = useState(() => emptyCoachForm());
  const [specializationOptions, setSpecializationOptions] = useState([]);
  const [specializationsLoading, setSpecializationsLoading] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputId = useId();

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    setSpecializationsLoading(true);
    (async () => {
      try {
        const { specializations } = await adminListSpecializations(adminToken, {
          page: 1,
          limit: 200,
          status: "active",
        });
        if (cancelled) return;
        let options = Array.isArray(specializations) ? specializations : [];
        const currentId = initialCoach?.specializationId
          ? String(initialCoach.specializationId).trim()
          : "";
        if (currentId && !options.some((o) => getSpecializationOptionId(o) === currentId)) {
          try {
            const current = await adminGetSpecializationById(adminToken, currentId);
            if (current) options = [...options, current];
          } catch {
            /* keep active list only */
          }
        }
        setSpecializationOptions(options);
      } catch {
        if (!cancelled) setSpecializationOptions([]);
      } finally {
        if (!cancelled) setSpecializationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, initialCoach?.specializationId]);

  useEffect(() => {
    setValues(initialCoach ? coachToForm(initialCoach) : emptyCoachForm());
    setProfileFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialCoach]);

  useEffect(() => {
    if (!profileFile) return;
    const url = URL.createObjectURL(profileFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  const handleChange = (field) => (e) => {
    setValues((p) => ({ ...p, [field]: e.target.value }));
  };

  const handlePhoneInput = (e) => {
    setValues((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }));
  };

  const handlePhoneKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  };

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
    () => getLocationOptions(values.countryIso, values.stateCode),
    [values.countryIso, values.stateCode]
  );

  const setLocationCountryIso = (iso) => {
    const code = iso || "";
    const c = Country.getCountryByCode(code);
    setValues((p) => ({
      ...p,
      countryIso: code,
      country: c?.name ?? "",
      stateCode: "",
      state: "",
      city: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!adminToken) {
      const msg = "You are not signed in.";
      setFormError(msg);
      await Swal.fire({ icon: "error", title: "Validation error", text: msg });
      return;
    }
    const err = validateCoachForm(values);
    if (err) {
      setFormError(err);
      await Swal.fire({ icon: "error", title: "Validation error", text: err });
      return;
    }

    setSubmitting(true);
    try {
      let coach;
      if (mode === "create") {
        coach = await adminCreateWellnessCoach(adminToken, buildCoachPayload(values), profileFile);
      } else {
        const initial = coachToForm(initialCoach);
        const patch = {};
        const next = buildCoachPayload(values);
        const initialApi = buildCoachPayload(initial);
        for (const key of Object.keys(next)) {
          if (next[key] !== initialApi[key]) patch[key] = next[key];
        }
        const payload = buildCoachUpdatePayload(patch);
        if (Object.keys(payload).length === 0 && !profileFile) {
          onSuccess?.(initialCoach);
          return;
        }
        coach = await adminUpdateWellnessCoach(
          adminToken,
          coachId || resolveCoachId(initialCoach),
          payload,
          profileFile
        );
      }
      onSuccess?.(coach);
    } catch (ex) {
      if (ex?.status === 401) {
        dispatch(logout());
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

      <div className="d-flex flex-column flex-sm-row align-items-start gap-3 gap-sm-4 pb-4 mb-4 border-bottom">
        <div className="position-relative flex-shrink-0">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="d-none"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setProfileFile(file);
            }}
          />
          <label htmlFor={fileInputId} className="mb-0 d-block" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle border border-2 overflow-hidden bg-body-secondary d-flex align-items-center justify-content-center"
              style={{ width: 96, height: 96 }}
            >
              <AdminMediaImage
                path={initialCoach?.profileImage}
                src={previewUrl || undefined}
                round
                width={96}
                height={96}
                alt="Profile"
              />
            </div>
            <div className="text-center small text-primary mt-2">Photo</div>
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
            onChange={handleChange("name")}
            maxLength={NAME_MAX_LEN}
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
            onChange={handleChange("email")}
            required
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
          <span className="user-field__label">
            Specialization <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input form-select"
            value={values.specializationId}
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
          {!specializationsLoading && specializationOptions.length === 0 ? (
            <span className="user-field__label small text-body-secondary d-block mt-1">
              No active specializations. Add them under Specializations in the sidebar.
            </span>
          ) : null}
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
        <label className="user-field col-12">
          <span className="user-field__label">Bio</span>
          <textarea
            className="user-field__input"
            rows={3}
            value={values.bio}
            onChange={handleChange("bio")}
            maxLength={BIO_MAX_LEN}
          />
        </label>
      </div>

      <p className="small text-uppercase text-body-secondary fw-semibold mb-3 mt-2">Location</p>
      <div className="row g-3 mb-4">
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            Country <span className="required-dot">*</span>
          </span>
          <select
            id={`${fileInputId}-country`}
            className="user-field__input form-select"
            disabled
            required
            aria-readonly="true"
            value={values.countryIso || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setLocationCountryIso(v);
            }}
          >
            {!values.countryIso ? (
              <option value="" disabled>
                Select country
              </option>
            ) : null}
            {nameCountryOptions}
          </select>
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            State / region <span className="required-dot">*</span>
          </span>
          <select
            id={`${fileInputId}-state`}
            className="user-field__input form-select"
            value={values.stateCode || ""}
            disabled={!values.countryIso || locationOptions.citiesFromCountry}
            required={!locationOptions.citiesFromCountry}
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
        </label>
        <label className="user-field col-12 col-md-4">
          <span className="user-field__label">
            City <span className="required-dot">*</span>
          </span>
          <select
            id={`${fileInputId}-city`}
            className="user-field__input form-select"
            value={values.city || ""}
            disabled={
              !values.countryIso ||
              (!locationOptions.citiesFromCountry && !values.stateCode && locationOptions.states.length > 0)
            }
            required
            onChange={(e) => setValues((p) => ({ ...p, city: e.target.value }))}
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
        </label>
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-end pt-3 border-top">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary d-inline-flex align-items-center gap-2" disabled={submitting}>
          {submitting ? <WellnessCoachSubmitLoader /> : null}
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
