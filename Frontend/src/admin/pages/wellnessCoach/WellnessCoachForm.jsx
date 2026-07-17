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
import { adminGetRoleById, adminListRoles } from "../../api/roleApi.js";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { PermissionCheckboxTree } from "../../components/PermissionCheckboxTree.jsx";
import { logout } from "../../../store/authSlice.js";
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
  sanitizeBio,
  validateCoachForm,
} from "./WellnessCoachShared.js";
import {
  ALL_COACH_PERMISSION_KEYS,
  getCoachPermissionCheckboxGroups,
} from "../../../wellnessCoach/data/coachPermissionKeys.js";
import {
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  EMAIL_MAX_LEN,
  INDIAN_MOBILE_INPUT_PATTERN,
  PHONE_NATIONAL_LEN,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import {
  PROFILE_PASSWORD_MAX_LEN,
  PROFILE_PASSWORD_MIN_LEN,
} from "../../../utils/profilePasswordValidation.js";
import { WellnessCoachSubmitLoader } from "./WellnessCoachPageLoader.jsx";

function applyPermissionOverrides(rolePermissions, overrides) {
  const next = new Set(Array.isArray(rolePermissions) ? rolePermissions : []);
  if (overrides && typeof overrides === "object") {
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.add(key);
      else next.delete(key);
    }
  }
  return [...next];
}

function computePermissionOverrides(rolePermissions, selectedPermissions) {
  const roleSet = new Set(Array.isArray(rolePermissions) ? rolePermissions : []);
  const selectedSet = new Set(Array.isArray(selectedPermissions) ? selectedPermissions : []);
  const overrides = {};
  for (const key of ALL_COACH_PERMISSION_KEYS) {
    const inRole = roleSet.has(key);
    const selected = selectedSet.has(key);
    if (inRole !== selected) overrides[key] = selected;
  }
  return Object.keys(overrides).length > 0 ? overrides : null;
}

function overridesEqual(a, b) {
  const left = a && typeof a === "object" ? a : null;
  const right = b && typeof b === "object" ? b : null;
  return JSON.stringify(left) === JSON.stringify(right);
}

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
  const [coachRoles, setCoachRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [rbacLoading, setRbacLoading] = useState(false);
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
        const [{ roles }] = await Promise.all([
          adminListRoles(adminToken, { status: "active", limit: 200, scope: "COACH" }),
        ]);
        if (cancelled) return;
        setCoachRoles(Array.isArray(roles) ? roles : []);
        setCatalogGroups(getCoachPermissionCheckboxGroups());
      } catch {
        if (!cancelled) {
          setCoachRoles([]);
          setCatalogGroups(getCoachPermissionCheckboxGroups());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

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
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      const roleId = String(values.roleId || "").trim();
      if (!roleId) {
        setRolePermissions([]);
        setSelectedPermissions([]);
        return;
      }
      setRbacLoading(true);
      try {
        const role = await adminGetRoleById(adminToken, roleId);
        if (cancelled) return;
        const base = Array.isArray(role?.permissions) ? role.permissions : [];
        setRolePermissions(base);
        setSelectedPermissions(applyPermissionOverrides(base, values.permissionOverrides));
      } catch {
        if (!cancelled) {
          setRolePermissions([]);
          setSelectedPermissions([]);
        }
      } finally {
        if (!cancelled) setRbacLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only reload when roleId changes — overrides applied once from form seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, values.roleId]);

  const handleRoleChange = (e) => {
    const roleId = e.target.value;
    setValues((p) => ({ ...p, roleId, permissionOverrides: null }));
    setOverridesOpen(false);
  };

  const handleOverridePermissionsChange = (permissions) => {
    setSelectedPermissions(permissions);
    setValues((p) => ({
      ...p,
      permissionOverrides: computePermissionOverrides(rolePermissions, permissions),
    }));
  };

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

  const handleBioInput = (e) => {
    setValues((p) => ({ ...p, bio: sanitizeBio(e.target.value) }));
  };

  const handlePhoneKeyDown = blockIndianMobileFirstDigitKeyDown;
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
    const err = validateCoachForm(values, { requirePassword: mode === "create" });
    if (err) {
      setFormError(err);
      await Swal.fire({ icon: "error", title: "Validation error", text: err });
      return;
    }

    setSubmitting(true);
    try {
      let coach;
      const roleId = String(values.roleId || "").trim() || null;
      const permissionOverrides = roleId
        ? computePermissionOverrides(rolePermissions, selectedPermissions)
        : null;
      const fieldsForApi = {
        ...values,
        roleId,
        permissionOverrides,
      };

      if (mode === "create") {
        coach = await adminCreateWellnessCoach(adminToken, buildCoachPayload(fieldsForApi), profileFile);
      } else {
        const initial = coachToForm(initialCoach);
        const patch = {};
        const next = buildCoachPayload(fieldsForApi);
        const initialApi = buildCoachPayload({
          ...initial,
          roleId: initial.roleId || null,
          permissionOverrides: initial.permissionOverrides || null,
        });
        for (const key of Object.keys(next)) {
          if (key === "permissionOverrides") {
            if (!overridesEqual(next[key], initialApi[key])) patch[key] = next[key];
            continue;
          }
          if (next[key] !== initialApi[key]) patch[key] = next[key];
        }
        if (!String(values.password ?? "").trim()) {
          delete patch.password;
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
        <AdminImagePicker
          variant="avatar"
          label="Profile photo"
          chooseLabel="Photo"
          hint={`Crop to ${ADMIN_IMAGE_PRESETS.profile.width} × ${ADMIN_IMAGE_PRESETS.profile.height}px (max 25 MB). JPEG, PNG, GIF, or WebP.`}
          outputWidth={ADMIN_IMAGE_PRESETS.profile.width}
          outputHeight={ADMIN_IMAGE_PRESETS.profile.height}
          avatarSize={96}
          cropTitle="Crop profile image"
          file={profileFile}
          previewUrl={previewUrl || ""}
          baselinePath={initialCoach?.profileImage || ""}
          inputRef={fileInputRef}
          onChange={({ file, previewUrl: nextPreview }) => {
            if (previewUrl && String(previewUrl).startsWith("blob:") && previewUrl !== nextPreview) {
              URL.revokeObjectURL(previewUrl);
            }
            setProfileFile(file);
            setPreviewUrl(nextPreview || null);
          }}
        />
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
            maxLength={NAME_MAX_LEN}
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
            placeholder={mode === "create" ? `${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters` : "Leave blank to keep current password"}
            autoComplete={mode === "create" ? "new-password" : "off"}
            required={mode === "create"}
            minLength={mode === "create" ? PROFILE_PASSWORD_MIN_LEN : undefined}
            maxLength={PROFILE_PASSWORD_MAX_LEN}
          />
          {mode === "create" ? (
            <span className="user-field__label small text-body-secondary d-block mt-1">
              Use {PROFILE_PASSWORD_MIN_LEN}–{PROFILE_PASSWORD_MAX_LEN} characters.
            </span>
          ) : null}
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
              pattern={INDIAN_MOBILE_INPUT_PATTERN}
              aria-label="Mobile number without country code"
              maxLength={PHONE_NATIONAL_LEN}
              minLength={PHONE_NATIONAL_LEN}
              required
            />
          </div>
          <span className="user-field__label small text-body-secondary d-block mt-1">
            {PHONE_NATIONAL_LEN}-digit number starting with 6–9.
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
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Role</span>
          <select className="user-field__input" value={values.roleId || ""} onChange={handleRoleChange}>
            <option value="">No role (Full access)</option>
            {coachRoles.map((role) => (
              <option key={role.id || role._id} value={role.id || role._id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        {values.roleId ? (
          <div className="col-12">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setOverridesOpen((open) => !open)}
            >
              {overridesOpen ? "Hide" : "Show"} advanced: override permissions for this coach
            </button>
            {overridesOpen ? (
              <div className="mt-3">
                {rbacLoading ? (
                  <AdminPageLoader label="Loading role permissions..." />
                ) : (
                  <PermissionCheckboxTree
                    groups={catalogGroups}
                    selectedPermissions={selectedPermissions}
                    onChange={handleOverridePermissionsChange}
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        <label className="user-field col-12">
          <span className="user-field__label">Bio</span>
          <textarea
            className="user-field__input"
            rows={3}
            value={values.bio}
            onChange={handleBioInput}
            maxLength={BIO_MAX_LEN}
          />
          <span className="user-field__label small text-body-secondary d-block mt-1">
            {String(values.bio ?? "").length}/{BIO_MAX_LEN} characters
          </span>
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
