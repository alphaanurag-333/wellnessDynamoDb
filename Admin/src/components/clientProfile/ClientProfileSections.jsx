import { useEffect, useState } from "react";
import { AtAGlanceSection } from "./AtAGlanceSection.jsx";
import { BodyAnalyticsSection } from "./BodyAnalyticsSection.jsx";
import { InternalParametersSection } from "./InternalParametersSection.jsx";
import { LaunchSection } from "./LaunchSection.jsx";
import { FoodSection } from "./FoodSection.jsx";
import { BmsSection } from "./BmsSection.jsx";
import { NutritionsSection } from "./NutritionsSection.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import { getTierActions } from "../../data/userDetailData.js";
import { tierBadgeClass, tierBadgeStyle, tierLabel, normalizeTier } from "../../data/usersData.js";
import { adminListHealthConcerns } from "../../api/healthConcernApi.js";
import {
  moveUserToHeal,
  moveUserToMaintenance,
  moveUserToSeek,
  moveMaintenanceUserToHeal,
  updateUserPersonalDetails,
} from "../../api/usersApi.js";
import {
  PERSON_NAME_MAX_LEN,
  blockPersonNameDigitKeyDown,
  sanitizePersonName,
  validatePersonName,
} from "../../utils/personFieldValidation.js";

export { AtAGlanceSection, BodyAnalyticsSection, InternalParametersSection, LaunchSection, FoodSection, BmsSection, NutritionsSection };
export { HealthProgressSection } from "./HealthProgressSection.jsx";
export { ReflectionSection } from "./ReflectionSection.jsx";
export { PrescriptionSection } from "./PrescriptionSection.jsx";
export { PresentableSection } from "./PresentableSection.jsx";
export { ExchangeSection } from "./ExchangeSection.jsx";
export { ProtocolSection } from "./ProtocolSection.jsx";
export { GutResetSection } from "./GutResetSection.jsx";
export { CounsellingSection } from "./CounsellingSection.jsx";
export { ConsultationSection } from "./ConsultationSection.jsx";
export { MedicalConditionsSection } from "./MedicalConditionsSection.jsx";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse display DOB ("12 Mar 1991") or ISO into YYYY-MM-DD for <input type="date">. */
function dobToInputValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const display = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!display) return "";
  const month = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === display[2].toLowerCase());
  if (month < 0) return "";
  const day = String(Number(display[1])).padStart(2, "0");
  const mon = String(month + 1).padStart(2, "0");
  return `${display[3]}-${mon}-${day}`;
}

/** Format YYYY-MM-DD from date input into display DOB ("12 Mar 1991"). */
function inputValueToDob(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return "";
  return `${Number(match[3])} ${MONTHS_SHORT[month]} ${match[1]}`;
}

/** Parse "+91 96690 06444" → { phoneCountryCode, phone }. */
function parsePhoneDisplay(value) {
  const raw = String(value || "").trim();
  if (!raw) return { phoneCountryCode: "+91", phone: "" };
  const ccMatch = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  const phoneCountryCode = ccMatch ? ccMatch[1] : "+91";
  const rest = ccMatch ? ccMatch[2] : raw;
  const phone = rest.replace(/\D/g, "");
  return { phoneCountryCode, phone };
}

function phonesEqual(a, b) {
  return parsePhoneDisplay(a).phone === parsePhoneDisplay(b).phone
    && parsePhoneDisplay(a).phoneCountryCode === parsePhoneDisplay(b).phoneCountryCode;
}

function parseStateField(value, fallbackCountry = "") {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { state: match[1].trim(), country: match[2].trim() };
  return { state: raw, country: String(fallbackCountry || "").trim() };
}

function formFromUser(user) {
  return {
    name: user?.name || "",
    dob: user?.dob || "",
    phone: user?.phone || "",
    whatsapp: user?.whatsapp || "",
    address: user?.addressLine1 || "",
    state: user?.stateRaw
      ? (user?.country ? `${user.stateRaw} (${user.country})` : user.stateRaw)
      : (user?.state || ""),
    healthConcernId: user?.healthConcernId || "",
  };
}

function DosageBadge({ label, tone }) {
  return <span className={`ua-cp-dosage ua-cp-dosage--${tone}`}>{label}</span>;
}

export function PersonalDetailsSection({ user, onToast, onUserUpdated, showBack = false, onBack }) {
  const { can } = useViewAs();
  const canEditPii = can("console.pii.edit");
  const canEditClient = can("console.cl.edit");
  const [editing, setEditing] = useState(false);
  const [tierBusy, setTierBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [goalOptions, setGoalOptions] = useState([]);
  const [form, setForm] = useState(() => formFromUser(user));

  useEffect(() => {
    if (!canEditPii && editing) setEditing(false);
  }, [canEditPii, editing]);

  useEffect(() => {
    if (!editing) setForm(formFromUser(user));
  }, [user, editing]);

  useEffect(() => {
    let cancelled = false;
    adminListHealthConcerns(null, { limit: 200, status: "active" })
      .then((result) => {
        if (cancelled) return;
        setGoalOptions(
          (result?.healthConcerns || [])
            .filter((row) => row?.id && row?.title)
            .map((row) => ({ id: row.id, title: row.title })),
        );
      })
      .catch(() => {
        if (!cancelled) setGoalOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTier = normalizeTier(user.tier);
  const tierActions = getTierActions(currentTier, user.ageDays ?? 30);
  const tierBadgeTone = tierBadgeStyle(currentTier);
  const displayTierLabel = tierLabel(currentTier);
  const userId = String(user?.id || "").trim();
  const goalLabel = goalOptions.find((o) => o.id === form.healthConcernId)?.title
    || user.goal
    || "";

  const usedReferralCode = String(user?.referredByCode || "").trim();
  const fields = [
    { key: "name", label: "Full name", editable: true },
    { key: "dob", label: "Date of birth", editable: true },
    { key: "email", label: "Email", value: user.email, editable: false },
    { key: "phone", label: "Phone", editable: true },
    { key: "whatsapp", label: "WhatsApp", editable: true },
    { key: "address", label: "Complete address", editable: true },
    { key: "state", label: "State", editable: true },
    { key: "tier", label: "Plan / tier", value: displayTierLabel, editable: false },
    { key: "goal", label: "Goal", editable: true },
    { key: "coach", label: "Assigned coach", value: user.coach, editable: false },
    { key: "joined", label: "Joined", value: user.joined, editable: false },
    ...(usedReferralCode
      ? [{ key: "referredByCode", label: "Referral code used", value: usedReferralCode, editable: false }]
      : []),
    { key: "termsIp", label: "Terms & conditions IP", value: user.termsIp, editable: false },
    { key: "termsAccepted", label: "Terms & conditions accepted", value: user.termsAccepted, editable: false },
  ];

  function cancelEdit() {
    setForm(formFromUser(user));
    setEditing(false);
  }

  async function save() {
    if (!canEditPii || !userId || saveBusy) return;
    const name = sanitizePersonName(form.name).trim();
    const nameError = validatePersonName(name);
    if (nameError) {
      onToast(nameError);
      return;
    }

    const phoneParts = parsePhoneDisplay(form.phone);
    if (form.phone.trim() && phoneParts.phone.length !== 10) {
      onToast("Phone must be a 10-digit mobile number");
      return;
    }

    const whatsappParts = parsePhoneDisplay(form.whatsapp);
    if (form.whatsapp.trim() && whatsappParts.phone.length !== 10) {
      onToast("WhatsApp must be a 10-digit mobile number");
      return;
    }

    const dobIso = dobToInputValue(form.dob);
    const { state, country } = parseStateField(form.state, user.country);
    const sameWhatsapp = !form.whatsapp.trim() || phonesEqual(form.phone, form.whatsapp);
    const whatsappUnchanged = phonesEqual(form.whatsapp, user.whatsapp)
      || (!form.whatsapp.trim() && !String(user.whatsapp || "").trim());

    if (!sameWhatsapp && !whatsappUnchanged) {
      onToast("WhatsApp number changes require OTP verification on the client app");
      return;
    }

    const payload = {
      name,
      dob: dobIso || null,
      addressLine1: String(form.address || "").trim() || null,
      state: state || null,
      country: country || null,
    };

    if (phoneParts.phone) {
      payload.phone = phoneParts.phone;
      payload.phoneCountryCode = phoneParts.phoneCountryCode;
    }

    if (sameWhatsapp && phoneParts.phone) {
      payload.whatsappSameAsMobile = true;
    }

    if (form.healthConcernId) {
      payload.primaryHealthConcern = form.healthConcernId;
    }

    setSaveBusy(true);
    try {
      const updated = await updateUserPersonalDetails(userId, payload);
      onUserUpdated?.(updated);
      setEditing(false);
      onToast("Personal details saved");
    } catch (err) {
      onToast(err?.message || "Could not save personal details");
    } finally {
      setSaveBusy(false);
    }
  }

  async function convertTier() {
    if (!tierActions.canConvert || !userId || tierBusy) return;
    setTierBusy(true);
    try {
      const updated = currentTier === "Seek to Heal"
        ? await moveUserToMaintenance(userId)
        : await moveUserToHeal(userId);
      onUserUpdated?.(updated);
      onToast(`${user.name} converted to ${tierLabel(tierActions.upTier)}`);
    } catch (err) {
      onToast(err?.message || "Could not convert this client");
    } finally {
      setTierBusy(false);
    }
  }

  async function downgradeTier() {
    if (!tierActions.canDowngrade || !userId || tierBusy) return;
    setTierBusy(true);
    try {
      if (currentTier === "Maintenance") {
        const updated = await moveMaintenanceUserToHeal(userId);
        onUserUpdated?.(updated);
        onToast(`${user.name} moved back to HEAL`);
        return;
      }
      if (currentTier === "Seek to Heal") {
        const updated = await moveUserToSeek(userId);
        onUserUpdated?.(updated);
        onToast(`${user.name} moved down to SEEK`);
        return;
      }
      onToast("Downgrade is not available for this tier");
    } catch (err) {
      onToast(err?.message || "Could not downgrade user");
    } finally {
      setTierBusy(false);
    }
  }

  function fieldValue(f) {
    if (f.value !== undefined) return f.value;
    if (f.key === "goal") return goalLabel;
    if (f.key === "address" && !editing) return user.address || form.address || "";
    if (f.key === "state" && !editing) return user.state || form.state || "";
    return form[f.key] ?? "";
  }

  function renderEditControl(f) {
    if (f.key === "dob") {
      return (
        <input
          type="date"
          className="ua-cp-field__input ua-cp-field__input--date"
          value={dobToInputValue(form.dob)}
          max={new Date().toISOString().slice(0, 10)}
          disabled={saveBusy}
          onChange={(e) => setForm((prev) => ({ ...prev, dob: inputValueToDob(e.target.value) }))}
        />
      );
    }
    if (f.key === "goal") {
      return (
        <select
          className="ua-cp-field__input ua-cp-field__input--select"
          value={form.healthConcernId}
          disabled={saveBusy}
          onChange={(e) => setForm((prev) => ({ ...prev, healthConcernId: e.target.value }))}
        >
          <option value="">Select goal</option>
          {goalOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.title}</option>
          ))}
        </select>
      );
    }
    if (f.key === "name") {
      return (
        <input
          className="ua-cp-field__input"
          value={form.name ?? ""}
          maxLength={PERSON_NAME_MAX_LEN}
          disabled={saveBusy}
          onKeyDown={blockPersonNameDigitKeyDown}
          onChange={(e) => setForm((prev) => ({ ...prev, name: sanitizePersonName(e.target.value) }))}
        />
      );
    }
    return (
      <input
        className="ua-cp-field__input"
        value={form[f.key] ?? ""}
        disabled={saveBusy}
        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
      />
    );
  }

  return (
    <div className="ua-cp-section ua-cp-personal">
      <div className="ua-cp-personal__head">
        {showBack ? (
          <button
            type="button"
            className="ua-cp-section-back"
            onClick={onBack}
            title="Back to previous screen"
          >
            ‹ Back
          </button>
        ) : null}
        <div className="ua-cp-personal__head-row">
          <div className="ua-cp-personal__head-copy">
            <h2 className="ua-cp-personal__title">Personal details</h2>
            <p className="ua-cp-personal__email">{user.email}</p>
          </div>
          <div className="ua-cp-personal__actions">
            {canEditPii ? (
              editing ? (
                <>
                  <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={cancelEdit} disabled={saveBusy}>Cancel</button>
                  <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={save} disabled={saveBusy}>
                    {saveBusy ? "Saving…" : "Save changes"}
                  </button>
                </>
              ) : (
                <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
      <div className="ua-cp-personal__badges">
        <span className={`ua-cp-tier-badge ua-cp-tier-badge--${tierBadgeClass(currentTier)}`} style={tierBadgeTone}>{displayTierLabel}</span>
        {canEditClient && tierActions.canConvert ? (
          <button
            type="button"
            className="ua-cp-tier-action ua-cp-tier-action--up"
            title={tierActions.convertTitle}
            onClick={convertTier}
            disabled={tierBusy}
          >
            {tierActions.convertLabel}
          </button>
        ) : null}
        {canEditClient && tierActions.canDowngrade ? (
          <button
            type="button"
            className="ua-cp-tier-action ua-cp-tier-action--down"
            title={tierActions.downgradeTitle}
            onClick={downgradeTier}
            disabled={tierBusy}
          >
            {tierActions.downgradeLabel}
          </button>
        ) : null}
        <span className="ua-cp-status-badge"><span className="ua-cp-status-badge__dot" />{user.status || "Active"}</span>
      </div>

      <div className="ua-cp-personal__card">
        {fields.map((f) => {
          const val = fieldValue(f);
          const empty = !String(val || "").trim();
          return (
            <div key={f.label} className={`ua-cp-field${empty ? " ua-cp-field--empty" : ""}`}>
              <span className="ua-cp-field__label">{f.label}</span>
              {editing && f.editable ? renderEditControl(f) : (
                <span className="ua-cp-field__value">{val || "Not submitted"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlaceholderSection({ title, subtitle }) {
  return (
    <div className="ua-cp-section ua-cp-placeholder">
      <h2 className="ua-cp-placeholder__title">{title}</h2>
      {subtitle ? <p className="ua-cp-placeholder__sub">{subtitle}</p> : null}
      <p className="ua-cp-placeholder__note">This section will be connected to live data soon.</p>
    </div>
  );
}
