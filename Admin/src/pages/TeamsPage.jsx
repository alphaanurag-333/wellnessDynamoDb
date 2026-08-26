import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { TeamRemindModal } from "../components/TeamRemindModal.jsx";
import { CfgSelect, OrangeButton, PageHeader, PillTabs, SectionLabel, TableScroll, ListPagination } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  STAFF_AVATARS,
  STAFF_COL3,
  TEAM_ROLE_META,
  TEAM_ROLE_TABS_BASE,
  staffInitials,
} from "../data/teamsData.js";
import {
  createTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  listTeamParentOptions,
  regenerateTeamMemberTotp,
  sendTeamReminder,
  sendTeamWhatsAppReminder,
  setAccessMemberRole,
  setTeamMemberTotp,
  updateTeamMember,
} from "../api/teamsApi.js";
import { fetchAccessRoles } from "../api/accessApi.js";
import { fetchUsers } from "../api/usersApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  EMAIL_MAX_LEN,
  PERSON_NAME_MAX_LEN,
  PHONE_NATIONAL_LEN,
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  maxAllowedDobIso,
  parseDateOfBirthIso,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
  validateDateOfBirth,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
} from "../utils/personFieldValidation.js";
import { COUNTRY_OPTIONS, INDIA_STATES, citiesForState } from "../data/indiaLocations.js";
import { resolveBaseUiRoleKey, SYSTEM_TEAM_UI_KEYS } from "../utils/liveRoles.js";

const SYSTEM_TEAM_ROLE_KEYS = SYSTEM_TEAM_UI_KEYS;
const PAGE_SIZE = 20;
const ALL_TAB_ID = "all";
const TEAM_BIO_MAX_LEN = 500;
const ROLE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function TeamMemberAvatar({ name, profileImage, colorIndex }) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(profileImage) && !broken;
  const color = STAFF_AVATARS[colorIndex % STAFF_AVATARS.length];
  return (
    <span
      className={`ua-avatar ua-avatar--staff${showPhoto ? " ua-avatar--photo" : ""}`}
      style={
        showPhoto
          ? { borderColor: color }
          : { background: color, borderColor: color }
      }
      aria-hidden={showPhoto ? undefined : true}
    >
      {showPhoto ? (
        <img src={profileImage} alt="" onError={() => setBroken(true)} />
      ) : (
        staffInitials(name)
      )}
    </span>
  );
}

const ACTION_ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

async function copyText(value) {
  const text = String(value || "");
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function IconEditProfile() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconDeleteMember() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function memberRemindMessage(name) {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  return `Hi ${first}, a quick reminder on your pending items — please take a look when you get a moment.`;
}

function isAdminAccessRole(role) {
  const key = String(role?.roleKey || "").toLowerCase();
  return key === "admin";
}

function roleChipMeta(role, fallbackKey = "wc") {
  const key = role?.roleKey || fallbackKey;
  const base = TEAM_ROLE_META[key] || TEAM_ROLE_META.wc;
  return {
    name: role?.name || base.name,
    roleColor: role?.color || base.roleColor,
    roleBg: role?.bg || base.roleBg,
    roleBorder: role?.bd || base.roleBorder,
  };
}

function nationalPhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.slice(-PHONE_NATIONAL_LEN);
}

function CredentialsModal({ open, payload, onClose, onToast }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function buildQr() {
      if (!open || !payload?.totpOtpauthUrl) {
        setQrDataUrl("");
        return;
      }
      try {
        const url = await QRCode.toDataURL(payload.totpOtpauthUrl, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl("");
      }
    }
    buildQr();
    return () => {
      cancelled = true;
    };
  }, [open, payload?.totpOtpauthUrl]);

  if (!open || !payload) return null;

  async function handleCopy(label, value) {
    const ok = await copyText(value);
    onToast?.(ok ? `${label} copied` : `Could not copy ${label.toLowerCase()}`);
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-teams-creds"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ua-teams-creds-title"
      >
        <div className="ua-teams-creds__head">
          <div className="ua-teams-creds__copy">
            <h2 id="ua-teams-creds-title">Share login credentials</h2>
            <p>
              {payload.name
                ? `Give ${payload.name} these details offline. The authenticator key is shown once.`
                : "Share these details offline. The authenticator key is shown once."}
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ua-teams-creds__body">
          <p className="ua-teams-creds__warn">
            Store or share securely now. Use Regenerate key later if the member loses access.
          </p>
          {payload.temporaryPassword ? (
            <div className="ua-teams-creds__field">
              <span className="ua-teams-creds__label">Temporary password</span>
              <div className="ua-teams-creds__row">
                <code className="ua-teams-creds__value">{payload.temporaryPassword}</code>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline"
                  onClick={() => handleCopy("Password", payload.temporaryPassword)}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
          {payload.totpSecret ? (
            <div className="ua-teams-creds__field">
              <span className="ua-teams-creds__label">Authenticator key</span>
              <div className="ua-teams-creds__row">
                <code className="ua-teams-creds__value">{payload.totpSecret}</code>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline"
                  onClick={() => handleCopy("Authenticator key", payload.totpSecret)}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
          {qrDataUrl ? (
            <img className="ua-teams-creds__qr" src={qrDataUrl} alt="Authenticator QR code" />
          ) : null}
        </div>
        <div className="ua-teams-creds__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateMemberModal({
  open,
  member,
  roles,
  parentOptions,
  isSuperAdmin,
  onClose,
  onSaved,
  onToast,
  onCredentials,
}) {
  const creatableRoles = useMemo(
    () => (roles || []).filter((r) => !isAdminAccessRole(r)),
    [roles],
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [consoleRoleId, setConsoleRoleId] = useState("");
  const [parentAccountId, setParentAccountId] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [totpBusy, setTotpBusy] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [nameSearchBusy, setNameSearchBusy] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const nameSearchRef = useRef(null);
  const nameSearchSeq = useRef(0);
  const skipNameSearchRef = useRef(false);

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const isEdit = Boolean(member?.id);
  const memberId = member?.id || "";
  const memberParentId = member?.parentAccountId || "";

  function resetNameSearch() {
    nameSearchSeq.current += 1;
    setNameSuggestions([]);
    setNameSearchBusy(false);
    setNameMenuOpen(false);
  }

  function applyUserToForm(user) {
    if (!user) return;
    skipNameSearchRef.current = true;
    setName(sanitizePersonName(user.name || ""));
    setDob(parseDateOfBirthIso(user.dobIso) || "");
    setPhone(nationalPhoneDigits(user.phone));
    setEmail(sanitizeEmailInput(user.email || ""));
    setCountry(String(user.country || "").trim());
    setState(String(user.stateRaw || "").trim());
    setCity(String(user.city || "").trim());
    setBio("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      delete next.dob;
      delete next.phone;
      delete next.email;
      delete next.country;
      delete next.state;
      delete next.city;
      return next;
    });
    resetNameSearch();
  }

  // Edit: reset only when opening / switching members (not on roles reload or totp updates).
  useEffect(() => {
    if (!open || !member?.id) return;
    setErrors({});
    setName(sanitizePersonName(member.name || ""));
    setPhone(nationalPhoneDigits(member.phone));
    setEmail(sanitizeEmailInput(member.email || ""));
    setDob(parseDateOfBirthIso(member.dateOfBirth) || "");
    setCountry(member.country || "");
    setState(member.state || "");
    setCity(member.city || "");
    setBio(String(member.bio || "").slice(0, TEAM_BIO_MAX_LEN));
    setConsoleRoleId(member.consoleRoleId || "");
    setParentAccountId(member.parentAccountId || "");
    setTotpRequired(Boolean(member.totpRequired));
    resetNameSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memberId]);

  // Create: reset when opening create modal.
  useEffect(() => {
    if (!open || memberId) return;
    setErrors({});
    setName("");
    setPhone("");
    setEmail("");
    setDob("");
    setCountry("");
    setState("");
    setCity("");
    setBio("");
    const defaultRole = creatableRoles.find((r) => r.roleKey === "wc") || creatableRoles[0];
    setConsoleRoleId(defaultRole?.id || "");
    setParentAccountId("");
    setTotpRequired(false);
    skipNameSearchRef.current = false;
    resetNameSearch();
  }, [open, memberId, creatableRoles]);

  // Create: debounced client-user search for Full name autofill.
  useEffect(() => {
    if (!open || isEdit) return undefined;
    if (skipNameSearchRef.current) {
      skipNameSearchRef.current = false;
      setNameSuggestions([]);
      setNameSearchBusy(false);
      setNameMenuOpen(false);
      return undefined;
    }
    const query = name.trim();
    if (query.length < 2) {
      setNameSuggestions([]);
      setNameSearchBusy(false);
      setNameMenuOpen(false);
      return undefined;
    }
    const seq = ++nameSearchSeq.current;
    setNameSearchBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchUsers({ search: query, limit: 10, page: 1 });
        if (nameSearchSeq.current !== seq) return;
        setNameSuggestions(Array.isArray(result?.users) ? result.users : []);
        setNameMenuOpen(true);
      } catch {
        if (nameSearchSeq.current !== seq) return;
        setNameSuggestions([]);
        setNameMenuOpen(true);
      } finally {
        if (nameSearchSeq.current === seq) setNameSearchBusy(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, isEdit, name]);

  useEffect(() => {
    if (!nameMenuOpen) return undefined;
    function onPointerDown(event) {
      if (nameSearchRef.current?.contains(event.target)) return;
      setNameMenuOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setNameMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [nameMenuOpen]);

  useEffect(() => {
    if (!open || !memberId) return;
    setTotpRequired(Boolean(member?.totpRequired));
  }, [open, memberId, member?.totpRequired]);

  const selectedRole = creatableRoles.find((r) => r.id === consoleRoleId) || null;
  const baseUiKey = selectedRole ? resolveBaseUiRoleKey(selectedRole, creatableRoles) : null;
  const indiaSelected = country === "India";
  const cityOptions = useMemo(() => citiesForState(state), [state]);
  const needsParent = baseUiKey === "awc" || baseUiKey === "trainee";
  const parentRoleKey =
    baseUiKey === "trainee" ? "assistant_wellness_coach" : "wellness_coach";
  const eligibleParents = useMemo(
    () =>
      (parentOptions || []).filter((account) =>
        account.roleKeys?.includes(parentRoleKey) &&
        (!memberId || account.id !== memberId),
      ),
    [parentOptions, parentRoleKey, memberId],
  );

  useEffect(() => {
    if (!open || !needsParent) return;
    // Don't wipe Reports To while parent options are still loading.
    if (!eligibleParents.length) return;
    setParentAccountId((current) => {
      if (current && eligibleParents.some((parent) => parent.id === current)) {
        return current;
      }
      if (memberParentId && eligibleParents.some((parent) => parent.id === memberParentId)) {
        return memberParentId;
      }
      // Create: default to first coach. Edit: keep empty so we don't reassign by accident.
      if (!isEdit) return eligibleParents[0]?.id || "";
      return current || "";
    });
  }, [open, needsParent, parentRoleKey, eligibleParents, memberParentId, isEdit]);

  if (!open) return null;

  function validate() {
    const next = {};
    const nameErr = validatePersonName(name);
    if (nameErr) next.name = nameErr;
    const phoneErr = validatePhoneDigits(phone);
    if (phoneErr) next.phone = phoneErr;
    if (!isEdit) {
      const emailErr = validateEmail(email);
      if (emailErr) next.email = emailErr;
    }
    const dobErr = validateDateOfBirth(dob, { required: true });
    if (dobErr) next.dob = dobErr;
    if (!country) next.country = "Country is required.";
    if (!String(state || "").trim()) next.state = "State / region is required.";
    if (!String(city || "").trim()) next.city = "City is required.";
    const bioText = String(bio || "").trim();
    if (bioText.length > TEAM_BIO_MAX_LEN) {
      next.bio = `Bio must be at most ${TEAM_BIO_MAX_LEN} characters.`;
    }
    if (!consoleRoleId) next.role = "Pick a role.";
    if (needsParent && !parentAccountId) {
      next.parent = `Pick a ${baseUiKey === "trainee" ? "Assistant WC" : "Wellness Coach"} this person reports to.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isEdit) {
        const result = await updateTeamMember(member.id, {
          name: name.trim(),
          phone: phone.trim(),
          phoneCountryCode: member.phoneCountryCode || "+91",
          dateOfBirth: dob,
          country: country.trim(),
          state: state.trim(),
          city: city.trim(),
          bio: String(bio || "").trim() || null,
        });
        const roleChanged = consoleRoleId !== (member.consoleRoleId || "");
        const nextParent = needsParent ? parentAccountId : "";
        const existingParent = member.parentAccountId || "";
        const parentChanged = nextParent !== existingParent;
        // Avoid clearing Reports To when the dropdown is empty due to loading/race.
        const shouldUpdateRole =
          roleChanged ||
          (parentChanged && (!needsParent || Boolean(parentAccountId) || !existingParent));
        if (shouldUpdateRole) {
          await setAccessMemberRole(member.id, {
            consoleRoleId,
            roleKey: selectedRole?.roleKey || baseUiKey || undefined,
            parentAccountId: needsParent ? parentAccountId || null : null,
          });
        }
        let account = result.account;
        if (isSuperAdmin && totpRequired !== Boolean(member.totpRequired)) {
          const totpResult = await setTeamMemberTotp(member.id, { totpRequired });
          account = totpResult.account || account;
          if (totpResult.totpSecret) {
            onCredentials?.({
              name: account?.name || name.trim(),
              totpSecret: totpResult.totpSecret,
              totpOtpauthUrl: totpResult.totpOtpauthUrl,
            });
          }
        }
        onToast(`Updated ${account?.name || name.trim()}`);
        onSaved(account);
        onClose();
        return;
      }
      const result = await createTeamMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        phoneCountryCode: "+91",
        dateOfBirth: dob,
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        bio: String(bio || "").trim() || null,
        consoleRoleId,
        roleKey: selectedRole?.roleKey || baseUiKey || undefined,
        parentAccountId: needsParent ? parentAccountId : undefined,
        totpRequired: isSuperAdmin ? totpRequired : false,
      });
      onToast(`Created ${result.account?.name || name.trim()}`);
      onSaved(result.account);
      onClose();
      if (result.temporaryPassword || result.totpSecret) {
        onCredentials?.({
          name: result.account?.name || name.trim(),
          temporaryPassword: result.temporaryPassword,
          totpSecret: result.totpSecret,
          totpOtpauthUrl: result.totpOtpauthUrl,
        });
      }
    } catch (err) {
      onToast(err?.message || (isEdit ? "Update failed" : "Create failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateTotp() {
    if (!member?.id || !isSuperAdmin) return;
    setTotpBusy(true);
    try {
      const result = await regenerateTeamMemberTotp(member.id);
      onToast("Authenticator key regenerated");
      onSaved(result.account);
      onCredentials?.({
        name: result.account?.name || member.name,
        totpSecret: result.totpSecret,
        totpOtpauthUrl: result.totpOtpauthUrl,
      });
    } catch (err) {
      onToast(err?.message || "Could not regenerate authenticator key");
    } finally {
      setTotpBusy(false);
    }
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={busy || totpBusy ? undefined : onClose} role="presentation">
      <div
        className="ua-teams-create"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ua-teams-create-title"
      >
        <div className="ua-teams-create__head">
          <div className="ua-teams-create__lead">
            <span className="ua-teams-create__icon" aria-hidden="true">
            👤
            </span>
            <div className="ua-teams-create__copy">
              <h2 id="ua-teams-create-title">{isEdit ? "Edit profile" : "Create a team member"}</h2>
              <p>{isEdit ? "Same fields as create · email cannot be changed" : "Works for every role"}</p>
            </div>
          </div>
          <button
            type="button"
            className="ua-cfg-icon-btn"
            aria-label="Close"
            disabled={busy || totpBusy}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="ua-teams-create__form" onSubmit={handleSubmit} noValidate>
          <div className="ua-teams-create__body">
            {/* <div className="ua-teams-create__section">Personal</div> */}
            <div className="ua-teams-create__grid">
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label-row">
                  <span className="ua-teams-create__label">
                    Full name <span aria-hidden="true">*</span>
                  </span>
                  <span className="ua-teams-create__count">{name.trim().length}/{PERSON_NAME_MAX_LEN}</span>
                </span>
                {isEdit ? (
                  <input
                    className={`ua-teams-create__input${errors.name ? " is-invalid" : ""}`}
                    placeholder="e.g. Anita Rao"
                    value={name}
                    maxLength={PERSON_NAME_MAX_LEN}
                    autoComplete="name"
                    onKeyDown={blockPersonNameDigitKeyDown}
                    onChange={(event) => {
                      setName(sanitizePersonName(event.target.value));
                      clearError("name");
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="ua-teams-create__name-search" ref={nameSearchRef}>
                    <input
                      className={`ua-teams-create__input${errors.name ? " is-invalid" : ""}`}
                      placeholder="Search client by name…"
                      value={name}
                      maxLength={PERSON_NAME_MAX_LEN}
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={nameMenuOpen}
                      aria-controls="ua-teams-name-suggestions"
                      aria-autocomplete="list"
                      onKeyDown={blockPersonNameDigitKeyDown}
                      onFocus={() => {
                        if (name.trim().length >= 2) setNameMenuOpen(true);
                      }}
                      onChange={(event) => {
                        setName(sanitizePersonName(event.target.value));
                        clearError("name");
                      }}
                      autoFocus
                    />
                    {nameMenuOpen && name.trim().length >= 2 ? (
                      <ul
                        id="ua-teams-name-suggestions"
                        className="ua-teams-create__name-menu"
                        role="listbox"
                      >
                        {nameSearchBusy ? (
                          <li className="ua-teams-create__name-empty">Searching…</li>
                        ) : nameSuggestions.length ? (
                          nameSuggestions.map((user) => (
                            <li key={user.id} role="option">
                              <button
                                type="button"
                                className="ua-teams-create__name-option"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => applyUserToForm(user)}
                              >
                                <span className="ua-teams-create__name-option-title">{user.name}</span>
                                <span className="ua-teams-create__name-option-meta">
                                  {[user.email, nationalPhoneDigits(user.phone) || null]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="ua-teams-create__name-empty">No matching clients</li>
                        )}
                      </ul>
                    ) : null}
                  </div>
                )}
                {errors.name ? <span className="ua-teams-create__error">{errors.name}</span> : null}
              </label>
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  Date of birth <span aria-hidden="true">*</span>
                </span>
                <input
                  className={`ua-teams-create__input${errors.dob ? " is-invalid" : ""}`}
                  type="date"
                  value={dob}
                  onChange={(event) => {
                    setDob(event.target.value);
                    clearError("dob");
                  }}
                />
                {errors.dob ? <span className="ua-teams-create__error">{errors.dob}</span> : null}
              </label>
            </div>
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label-row">
                <span className="ua-teams-create__label">Bio</span>
                <span className="ua-teams-create__count">{bio.length}/{TEAM_BIO_MAX_LEN}</span>
              </span>
              <textarea
                className={`ua-teams-create__bio${errors.bio ? " is-invalid" : ""}`}
                rows={2}
                value={bio}
                maxLength={TEAM_BIO_MAX_LEN}
                placeholder="Short bio shown on their profile (optional)"
                onChange={(event) => {
                  setBio(event.target.value.slice(0, TEAM_BIO_MAX_LEN));
                  clearError("bio");
                }}
              />
              {errors.bio ? <span className="ua-teams-create__error">{errors.bio}</span> : null}
            </label>

            {/* <div className="ua-teams-create__section">Contact</div> */}
            <div className="ua-teams-create__grid ua-teams-create__grid--contact">
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  Mobile number <span aria-hidden="true">*</span>
                </span>
                <input
                  className={`ua-teams-create__input${errors.phone ? " is-invalid" : ""}`}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  maxLength={PHONE_NATIONAL_LEN}
                  onKeyDown={blockIndianMobileFirstDigitKeyDown}
                  onChange={(event) => {
                    setPhone(sanitizePhoneDigits(event.target.value));
                    clearError("phone");
                  }}
                />
                {errors.phone ? <span className="ua-teams-create__error">{errors.phone}</span> : null}
              </label>
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label-row">
                  <span className="ua-teams-create__label">
                    Email address <span aria-hidden="true">*</span>
                  </span>
                  <span className="ua-teams-create__count">{email.trim().length}/{EMAIL_MAX_LEN}</span>
                </span>
                <input
                  className={`ua-teams-create__input${errors.email ? " is-invalid" : ""}${isEdit ? " is-readonly" : ""}`}
                  placeholder="name@company.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={EMAIL_MAX_LEN}
                  readOnly={isEdit}
                  aria-readonly={isEdit ? "true" : undefined}
                  onChange={isEdit ? undefined : (event) => {
                    setEmail(sanitizeEmailInput(event.target.value));
                    clearError("email");
                  }}
                />
                {errors.email ? <span className="ua-teams-create__error">{errors.email}</span> : null}
              </label>
            </div>

            {/* <div className="ua-teams-create__section">Location</div> */}
            <div className="ua-teams-create__grid ua-teams-create__grid--location">
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Country <span aria-hidden="true">*</span>
              </span>
              <CfgSelect
                searchable
                searchPlaceholder="Search countries…"
                className={`ua-teams-create__select${errors.country ? " is-invalid" : ""}`}
                options={COUNTRY_OPTIONS.map((name) => ({ value: name, label: name }))}
                value={country}
                disabled={busy}
                onChange={(value) => {
                  setCountry(value);
                  setState("");
                  setCity("");
                  clearError("country");
                  clearError("state");
                  clearError("city");
                }}
                ariaLabel="Country"
                placeholder="Select country"
              />
              {errors.country ? <span className="ua-teams-create__error">{errors.country}</span> : null}
            </label>
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  State / region <span aria-hidden="true">*</span>
                </span>
                {indiaSelected ? (
                  <CfgSelect
                    searchable
                    searchPlaceholder="Search states…"
                    className={`ua-teams-create__select${errors.state ? " is-invalid" : ""}`}
                    options={INDIA_STATES.map((name) => ({ value: name, label: name }))}
                    value={state}
                    disabled={busy || !country}
                    onChange={(value) => {
                      setState(value);
                      setCity("");
                      clearError("state");
                      clearError("city");
                    }}
                    ariaLabel="State"
                    placeholder="Select state"
                  />
                ) : (
                  <input
                    className={`ua-teams-create__input${errors.state ? " is-invalid" : ""}`}
                    placeholder="State or region"
                    value={state}
                    disabled={busy || !country}
                    onChange={(event) => {
                      setState(event.target.value);
                      clearError("state");
                    }}
                  />
                )}
                {errors.state ? <span className="ua-teams-create__error">{errors.state}</span> : null}
              </label>
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  City <span aria-hidden="true">*</span>
                </span>
                {indiaSelected ? (
                  <CfgSelect
                    searchable
                    searchPlaceholder="Search cities…"
                    className={`ua-teams-create__select${errors.city ? " is-invalid" : ""}`}
                    options={cityOptions.map((name) => ({ value: name, label: name }))}
                    value={city}
                    disabled={busy || !state}
                    onChange={(value) => {
                      setCity(value);
                      clearError("city");
                    }}
                    ariaLabel="City"
                    placeholder={state ? "Select city" : "Pick state first"}
                  />
                ) : (
                  <input
                    className={`ua-teams-create__input${errors.city ? " is-invalid" : ""}`}
                    placeholder="City"
                    value={city}
                    disabled={busy || !country}
                    onChange={(event) => {
                      setCity(event.target.value);
                      clearError("city");
                    }}
                  />
                )}
                {errors.city ? <span className="ua-teams-create__error">{errors.city}</span> : null}
              </label>
            </div>

            {/* <div className="ua-teams-create__section">Role</div> */}
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Role <span aria-hidden="true">*</span>
              </span>
              <CfgSelect
                searchable
                searchPlaceholder="Search roles…"
                className={`ua-teams-create__select${errors.role ? " is-invalid" : ""}`}
                options={creatableRoles.map((role) => ({ value: role.id, label: role.name }))}
                value={consoleRoleId}
                disabled={busy || creatableRoles.length === 0}
                onChange={(value) => {
                  setConsoleRoleId(value);
                  clearError("role");
                }}
                ariaLabel="Role"
                placeholder="No Access Control roles found"
              />
              {errors.role ? <span className="ua-teams-create__error">{errors.role}</span> : null}
            </label>
            {needsParent ? (
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  Reports to ({baseUiKey === "trainee" ? "Assistant WC" : "Wellness Coach"}){" "}
                  <span aria-hidden="true">*</span>
                </span>
                <CfgSelect
                  searchable
                  searchPlaceholder="Search coaches…"
                  className={`ua-teams-create__select${errors.parent ? " is-invalid" : ""}`}
                  options={eligibleParents.map((coach) => ({
                    value: coach.id,
                    label: `${coach.name} · ${coach.email}`,
                  }))}
                  value={parentAccountId}
                  disabled={busy}
                  onChange={(value) => {
                    setParentAccountId(value);
                    clearError("parent");
                  }}
                  ariaLabel="Reports to"
                  placeholder="Choose coach…"
                />
                {errors.parent ? <span className="ua-teams-create__error">{errors.parent}</span> : null}
              </label>
            ) : null}
            {isSuperAdmin ? (
              <div className="ua-teams-create__field">
                <label className="ua-teams-create__check">
                  <input
                    type="checkbox"
                    checked={totpRequired}
                    disabled={busy || totpBusy}
                    onChange={(event) => setTotpRequired(event.target.checked)}
                  />
                  <span className="ua-teams-create__check-copy">
                    <strong>Require authenticator for login</strong>
                    <span>{isEdit ? "Required after password." : "Share the authenticator key after create."}</span>
                  </span>
                </label>
                {isEdit ? (
                  <div className="ua-teams-2fa-actions">
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline"
                      disabled={busy || totpBusy}
                      onClick={handleRegenerateTotp}
                    >
                      {totpBusy ? "Regenerating…" : "Regenerate authenticator key"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="ua-teams-create__foot">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy || totpBusy}>
              Cancel
            </button>
            <button type="submit" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy || totpBusy || !consoleRoleId}>
              {busy ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamsPage() {
  const { showToast: onToast } = useOutletContext();
  const { isSuperAdmin, viewAs, sessionUi, can } = useViewAs();
  const teamsPersona = isSuperAdmin ? viewAs : sessionUi || viewAs;
  const actorIsWc = teamsPersona === "wc";
  const actorIsAwc = teamsPersona === "awc";
  const canCreateMember = can("console.tm.create");
  const canEditMember = can("console.tm.edit");
  const canDeleteMember = can("console.tm.delete");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [accessRoles, setAccessRoles] = useState([]);
  const [rolesReady, setRolesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [remindModal, setRemindModal] = useState(null);
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindBusyWhatsApp, setRemindBusyWhatsApp] = useState(false);
  const [parentOptions, setParentOptions] = useState([]);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [credentialsModal, setCredentialsModal] = useState(null);

  function openMemberRemind(member, roleName) {
    const name = member?.name || "team member";
    const defaultMessage = memberRemindMessage(name);
    setRemindModal({
      title: `Remind ${name}`,
      subtitle: [roleName, member?.meta].filter(Boolean).join(" · "),
      recipients: [name],
      accountIds: member?.id ? [member.id] : [],
      defaultMessage,
      message: defaultMessage,
    });
  }

  const teamRoles = useMemo(
    () =>
      (accessRoles || []).filter((role) => {
        if (isAdminAccessRole(role)) return false;
        const baseUiKey = resolveBaseUiRoleKey(role, accessRoles);
        if (!baseUiKey || !SYSTEM_TEAM_ROLE_KEYS.has(baseUiKey)) return false;
        if (actorIsAwc) return baseUiKey === "trainee";
        if (actorIsWc) return baseUiKey === "awc" || baseUiKey === "trainee";
        return true;
      }),
    [accessRoles, actorIsAwc, actorIsWc],
  );

  const createRoles = teamRoles;

  const pageParam = Number(searchParams.get("page"));
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const roleParam = searchParams.get("role") || "";
  const roleTab = roleParam || ALL_TAB_ID;
  const isAllTab = roleTab === ALL_TAB_ID;

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  const setRoleTab = (role) => {
    const next = new URLSearchParams(searchParams);
    if (!role || role === ALL_TAB_ID) next.delete("role");
    else next.set("role", role);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const roleById = useMemo(
    () => Object.fromEntries(teamRoles.map((r) => [r.id, r])),
    [teamRoles],
  );

  const activeRole = isAllTab ? null : roleById[roleTab];
  const selectedConsoleRoleId = !isAllTab && ROLE_ID_RE.test(roleTab) ? roleTab : undefined;
  const fallbackUiRoleKey = !isAllTab && TEAM_ROLE_META[roleTab] ? roleTab : undefined;

  const loadRoles = useCallback(async () => {
    try {
      const roles = await fetchAccessRoles();
      setAccessRoles(Array.isArray(roles) ? roles : []);
    } catch {
      setAccessRoles([]);
    } finally {
      setRolesReady(true);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const load = useCallback(() => {
    setReloadNonce((n) => n + 1);
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      if (!isAllTab && !selectedConsoleRoleId && !rolesReady) return;
      setLoading(true);
      setError("");
      try {
        const { members: rows, pagination: nextPagination } = await fetchTeamMembers({
          page: currentPage,
          limit: PAGE_SIZE,
          consoleRoleId: selectedConsoleRoleId,
          roleKey: selectedConsoleRoleId ? undefined : fallbackUiRoleKey,
        });
        if (cancelled) return;
        const list = (rows || []).filter((m) => !m.isSuperAdmin && m.primaryRoleKey !== "admin");
        setMembers(list);
        setPagination({
          page: Number(nextPagination?.page) || currentPage,
          limit: Number(nextPagination?.limit) || PAGE_SIZE,
          total: Number(nextPagination?.total) || 0,
          pages: Math.max(1, Number(nextPagination?.pages) || 1),
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load team");
        setMembers([]);
        setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [isAllTab, selectedConsoleRoleId, fallbackUiRoleKey, rolesReady, currentPage, reloadNonce]);

  useEffect(() => {
    if (loading || error) return;
    if (currentPage > pagination.pages) setPage(pagination.pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, error, loading, pagination.pages]);

  useEffect(() => {
    if (!createOpen && !editingMember?.id) return;
    listTeamParentOptions()
      .then(setParentOptions)
      .catch(() => setParentOptions([]));
  }, [createOpen, editingMember?.id]);

  const tabs = useMemo(() => {
    const roleTabs = teamRoles.length
      ? teamRoles.map((r) => ({
          id: r.id,
          label: r.name,
          count: r.memberCount || 0,
        }))
      : actorIsAwc || actorIsWc
        ? []
        : TEAM_ROLE_TABS_BASE.map((t) => ({ ...t, count: 0 }));
    const allCount = roleTabs.reduce((sum, tab) => sum + (Number(tab.count) || 0), 0);
    return [{ id: ALL_TAB_ID, label: "All", count: allCount }, ...roleTabs];
  }, [actorIsAwc, actorIsWc, teamRoles]);

  useEffect(() => {
    if (!teamRoles.length) return;
    if (isAllTab) return;
    if (!teamRoles.some((r) => r.id === roleTab || r.roleKey === roleTab)) {
      setRoleTab(ALL_TAB_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRoles, roleTab, isAllTab]);

  const rows = useMemo(() => {
    if (!actorIsAwc) return members;
    return members.filter((m) => {
      const accessRole =
        (m.consoleRoleId && roleById[m.consoleRoleId]) ||
        teamRoles.find((r) => r.roleKey && r.roleKey === m.primaryRoleKey) ||
        null;
      const baseUi =
        (accessRole && resolveBaseUiRoleKey(accessRole, teamRoles)) ||
        String(m.primaryRoleKey || "").toLowerCase();
      return baseUi === "trainee";
    });
  }, [actorIsAwc, members, roleById, teamRoles]);

  const baseUiForCol = activeRole
    ? resolveBaseUiRoleKey(activeRole, teamRoles) || activeRole.roleKey
    : null;
  const col3 = STAFF_COL3[baseUiForCol] || "Load";

  function openMember(id, focus) {
    const q = focus === "permissions" ? "?focus=permissions" : "";
    navigate(`${UPDATED_ADMIN_PATHS.teams}/${id}${q}`);
  }

  return (
    <main className="content ua-page-enter ua-teams-page">
      <PageHeader
        title="Teams & roles"
        subtitle={
          actorIsWc
            ? "Your Assistant WCs and the trainees below them."
            : actorIsAwc
              ? "Trainees assigned below you."
              : "Each team = 1 Wellness Coach + N assistants + assigned clients. Manage every staff role below."
        }
        actions={canCreateMember ? (
          <OrangeButton onClick={() => setCreateOpen(true)}>+ Create team member</OrangeButton>
        ) : null}
      />

      <SectionLabel hint="">Team</SectionLabel>
      <PillTabs tabs={tabs} active={roleTab} onChange={setRoleTab} />

      {loading ? <BrandLoader variant="page" label="Loading team…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={load}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error ? (
        <TableScroll>
          <div className="ua-table-card">
            <div className="ua-table ua-table--teams ua-table__head">
              <div>Name</div>
              <div>Role</div>
              <div>{col3}</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {rows.length === 0 ? (
              <div className="ua-table ua-table--teams ua-table__row">
                <div className="ua-table__muted" style={{ gridColumn: "1 / -1" }}>
                  {isAllTab ? "No team members yet." : "No members in this role yet."}
                </div>
              </div>
            ) : null}
            {rows.map((s, i) => {
              const accessRole =
                (s.consoleRoleId && roleById[s.consoleRoleId]) ||
                teamRoles.find((r) => r.roleKey && r.roleKey === s.primaryRoleKey) ||
                null;
              const meta = roleChipMeta(accessRole, s.primaryRoleKey);
              return (
                <div
                  key={s.id}
                  className="ua-table ua-table--teams ua-table__row"
                  onClick={() => openMember(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openMember(s.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ua-user-cell">
                    <TeamMemberAvatar
                      name={s.name}
                      profileImage={s.profileImage}
                      colorIndex={i}
                    />
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name">{s.name}</div>
                      <div className="ua-user-cell__sub ua-user-cell__email">{s.email}</div>
                    </div>
                  </div>
                  <div data-label="Role">
                    <span
                      className="ua-role-chip"
                      style={{
                        background: meta.roleBg,
                        color: meta.roleColor,
                        borderColor: meta.roleBorder,
                      }}
                    >
                      {meta.name}
                    </span>
                  </div>
                  <div className="ua-table__load" data-label={col3}>{s.meta}</div>
                  <div data-label="Status">
                    <div className="ua-team-status-stack">
                      <span
                        className={`ua-status-pill${
                          s.displayStatus === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"
                        }`}
                      >
                        {s.displayStatus || "Active"}
                      </span>
                      <span
                        className={`ua-status-pill${
                          s.totpRequired ? " ua-status-pill--2fa" : " ua-status-pill--2fa-off"
                        }`}
                      >
                        {s.totpRequired ? "2FA on" : "2FA off"}
                      </span>
                    </div>
                  </div>
                  <div className="ua-team-actions" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                    <div className="ua-team-actions__row">
                      {canEditMember || canDeleteMember ? (
                        <>
                          {canEditMember ? (
                            <button
                              type="button"
                              className="ua-team-actions__btn"
                              title="Send reminder"
                              aria-label={`Send reminder to ${s.name}`}
                              onClick={() => openMemberRemind(s, meta.name)}
                            >
                              🔔
                            </button>
                          ) : null}
                          {canEditMember ? (
                            <button
                              type="button"
                              className="ua-team-actions__btn"
                              title="Edit profile"
                              aria-label={`Edit profile for ${s.name}`}
                              onClick={() => setEditingMember(s)}
                            >
                              <IconEditProfile />
                            </button>
                          ) : null}
                          {canDeleteMember ? (
                            <button
                              type="button"
                              className="ua-team-actions__btn ua-team-actions__btn--danger"
                              title="Delete"
                              aria-label={`Delete ${s.name}`}
                              onClick={() => setDeletingMember(s)}
                            >
                              <IconDeleteMember />
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="ua-team-actions__link"
                        onClick={() => openMember(s.id, isSuperAdmin || actorIsWc ? "permissions" : undefined)}
                      >
                        {isSuperAdmin || actorIsWc ? "Permissions" : "View members"} ›
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TableScroll>
      ) : null}

      {!loading && !error ? (
        <ListPagination
          page={currentPage}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Team members pagination"
        />
      ) : null}

      <CreateMemberModal
        open={createOpen || Boolean(editingMember)}
        member={editingMember}
        roles={createRoles}
        parentOptions={parentOptions}
        isSuperAdmin={isSuperAdmin}
        onClose={() => {
          setCreateOpen(false);
          setEditingMember(null);
        }}
        onSaved={(account) => {
          if (account?.id) {
            setEditingMember((prev) =>
              prev?.id === account.id
                ? {
                    ...prev,
                    // Keep list-member fields (parentAccountId, meta, etc.); only refresh 2FA flags.
                    totpRequired: Boolean(account.totpRequired),
                    totpConfigured: Boolean(account.totpConfigured),
                    name: account.name || prev.name,
                    phone: account.phone ?? prev.phone,
                    phoneCountryCode: account.phoneCountryCode || prev.phoneCountryCode,
                  }
                : prev,
            );
          }
          load();
        }}
        onToast={onToast}
        onCredentials={(payload) => setCredentialsModal(payload)}
      />

      <CredentialsModal
        open={Boolean(credentialsModal)}
        payload={credentialsModal}
        onClose={() => setCredentialsModal(null)}
        onToast={onToast}
      />

      <ConfirmDialog
        open={Boolean(deletingMember)}
        tag="Teams"
        title={deletingMember ? `Delete ${deletingMember.name}?` : "Delete team member?"}
        body="This is a soft delete. It only works if no clients are assigned and no one reports to them in the hierarchy (for example Assistant WC under Wellness Coach, or Trainee under Assistant WC). Reassign those people first."
        cancelLabel="Cancel"
        confirmLabel={deleteBusy ? "Deleting…" : "Delete user"}
        confirmTone="danger"
        onCancel={deleteBusy ? undefined : () => setDeletingMember(null)}
        onConfirm={async () => {
          if (!deletingMember || deleteBusy) return;
          setDeleteBusy(true);
          try {
            await deleteTeamMember(deletingMember.id);
            onToast(`Deleted ${deletingMember.name}`);
            setDeletingMember(null);
            load();
          } catch (err) {
            onToast(err?.message || "Delete failed");
            setDeletingMember(null);
          } finally {
            setDeleteBusy(false);
          }
        }}
      />

      <TeamRemindModal
        open={Boolean(remindModal)}
        title={remindModal?.title ?? ""}
        subtitle={remindModal?.subtitle ?? ""}
        recipients={remindModal?.recipients ?? []}
        message={remindModal?.message ?? ""}
        defaultMessage={remindModal?.defaultMessage ?? ""}
        busyPush={remindBusy}
        busyWhatsApp={remindBusyWhatsApp}
        onMessageChange={(message) => setRemindModal((prev) => (prev ? { ...prev, message } : prev))}
        onReset={() => setRemindModal((prev) => (prev ? { ...prev, message: prev.defaultMessage } : prev))}
        onPush={async () => {
          if (!remindModal || remindBusy || remindBusyWhatsApp) return;
          const message = String(remindModal.message || "").trim();
          const accountIds = Array.isArray(remindModal.accountIds) ? remindModal.accountIds : [];
          if (!message) {
            onToast("Write a reminder message first");
            return;
          }
          if (!accountIds.length) {
            onToast("No team member to notify");
            return;
          }
          setRemindBusy(true);
          try {
            const data = await sendTeamReminder({ accountIds, message });
            onToast(data?.message || `Notification sent to ${remindModal.recipients?.length ?? 0} recipient(s)`);
            setRemindModal(null);
          } catch (err) {
            onToast(err?.message || "Failed to send notification");
          } finally {
            setRemindBusy(false);
          }
        }}
        onWhatsApp={async () => {
          if (!remindModal || remindBusy || remindBusyWhatsApp) return;
          const message = String(remindModal.message || "").trim();
          const accountIds = Array.isArray(remindModal.accountIds) ? remindModal.accountIds : [];
          if (!message) {
            onToast("Write a reminder message first");
            return;
          }
          if (!accountIds.length) {
            onToast("No team member to notify");
            return;
          }
          setRemindBusyWhatsApp(true);
          try {
            const data = await sendTeamWhatsAppReminder({ accountIds, message });
            onToast(data?.message || `WhatsApp sent to ${remindModal?.recipients.length ?? 0} recipient(s)`);
            setRemindModal(null);
          } catch (err) {
            onToast(err?.message || "Failed to send WhatsApp");
          } finally {
            setRemindBusyWhatsApp(false);
          }
        }}
        onClose={() => {
          if (!remindBusy && !remindBusyWhatsApp) setRemindModal(null);
        }}
      />
    </main>
  );
}
