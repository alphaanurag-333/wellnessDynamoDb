import { useEffect, useMemo, useState } from "react";
import { AtAGlanceSection } from "./AtAGlanceSection.jsx";
import { BodyAnalyticsSection } from "./BodyAnalyticsSection.jsx";
import { InternalParametersSection } from "./InternalParametersSection.jsx";
import { LaunchSection } from "./LaunchSection.jsx";
import { FoodSection } from "./FoodSection.jsx";
import { BmsSection } from "./BmsSection.jsx";
import { NutritionsSection } from "./NutritionsSection.jsx";
import { getTierActions } from "../../data/userDetailData.js";
import { tierBadgeClass, tierBadgeStyle, tierLabel, normalizeTier } from "../../data/usersData.js";
import {
  buildOnboardingAvailability,
  PAID_ONBOARDING_STATUS_KEYS,
  PAID_ONBOARDING_STEP_LABELS,
} from "../../api/usersApi.js";

export { AtAGlanceSection, BodyAnalyticsSection, InternalParametersSection, LaunchSection, FoodSection, BmsSection, NutritionsSection };
export { HealthProgressSection } from "./HealthProgressSection.jsx";
export { ReflectionSection } from "./ReflectionSection.jsx";
export { PrescriptionSection } from "./PrescriptionSection.jsx";
export { PresentableSection } from "./PresentableSection.jsx";
export { ExchangeSection } from "./ExchangeSection.jsx";
export { ProtocolSection } from "./ProtocolSection.jsx";
export { GutResetSection } from "./GutResetSection.jsx";

function DosageBadge({ label, tone }) {
  return <span className={`ua-cp-dosage ua-cp-dosage--${tone}`}>{label}</span>;
}

function formatStepStatus(value) {
  const raw = String(value || "pending").toLowerCase();
  if (raw === "done") return "Done";
  if (raw === "skipped") return "Skipped";
  return "Pending";
}

export function PersonalDetailsSection({ user, onToast }) {
  const [editing, setEditing] = useState(false);
  const [manualTier, setManualTier] = useState(null);
  const [form, setForm] = useState({
    name: user.name,
    dob: user.dob,
    phone: user.phone,
    whatsapp: user.whatsapp,
    address: user.address,
    state: user.state,
    goal: user.goal,
  });

  useEffect(() => {
    setForm({
      name: user.name || "",
      dob: user.dob || "",
      phone: user.phone || "",
      whatsapp: user.whatsapp || "",
      address: user.address || "",
      state: user.state || "",
      goal: user.goal || "",
    });
  }, [user]);

  const currentTier = normalizeTier(manualTier ?? user.tier);
  const tierActions = getTierActions(currentTier, user.ageDays ?? 30);
  const tierBadgeTone = tierBadgeStyle(currentTier);
  const displayTierLabel = tierLabel(currentTier);
  const tierConverted = manualTier !== null;
  const availability = useMemo(() => buildOnboardingAvailability(user), [user]);
  const stepStatus = user?.paidOnboardingStepStatus || {};

  function titleCaseOnboardingStep(step) {
    return String(step || "")
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  const paidOnboardingLabel = user.paidOnboardingCompleted
    ? "Completed"
    : user.paidOnboardingStep
      ? titleCaseOnboardingStep(user.paidOnboardingStep)
      : "Pending";

  const fields = [
    { key: "name", label: "Full name", editable: true },
    { key: "dob", label: "Date of birth", editable: true },
    { key: "gender", label: "Gender", value: user.gender, editable: false },
    { key: "email", label: "Email", value: user.email, editable: false },
    { key: "phone", label: "Phone", editable: true },
    { key: "whatsapp", label: "WhatsApp", editable: true },
    { key: "address", label: "Complete address", editable: true },
    { key: "city", label: "City", value: user.city, editable: false },
    { key: "state", label: "State", editable: true },
    { key: "country", label: "Country", value: user.country, editable: false },
    { key: "pincode", label: "Pincode", value: user.pincode, editable: false },
    { key: "tier", label: "Plan / tier", value: displayTierLabel, editable: false },
    { key: "goal", label: "Primary health concern", editable: true },
    { key: "dietaryPreference", label: "Dietary preference", value: user.dietaryPreference, editable: false },
    { key: "wellnessJourneyFor", label: "Wellness journey for", value: user.wellnessJourneyFor, editable: false },
    { key: "referralCode", label: "Referral code", value: user.referralCode, editable: false },
    { key: "coach", label: "Assigned coach", value: user.coach, editable: false },
    { key: "joined", label: "Joined", value: user.joined, editable: false },
    { key: "termsAccepted", label: "Terms & conditions accepted", value: user.termsAccepted, editable: false },
    { key: "paidOnboarding", label: "Paid onboarding", value: paidOnboardingLabel, editable: false },
  ];

  function save() {
    setEditing(false);
    onToast("Personal details saved");
  }

  function convertTier() {
    if (!tierActions.canConvert) return;
    setManualTier(tierActions.upTier);
    onToast(`${user.name} moved to ${tierLabel(tierActions.upTier)} by Admin`);
  }

  function downgradeTier() {
    if (!tierActions.canDowngrade) return;
    setManualTier(tierActions.downTier);
    onToast(`${user.name} moved down to ${tierLabel(tierActions.downTier)} by Admin`);
  }

  function revertTier() {
    setManualTier(null);
    onToast(`Manual conversion undone for ${user.name}`);
  }

  return (
    <div className="ua-cp-section ua-cp-personal">
      <div className="ua-cp-personal__head">
        <div className="ua-cp-personal__head-copy">
          <h2 className="ua-cp-personal__title">Personal details</h2>
          <p className="ua-cp-personal__email">{user.email}</p>
          <p className="ua-cp-personal__avail">
            Onboarding data from User table · {availability.availableCount} of {availability.totalCount} fields available
          </p>
        </div>
        <div className="ua-cp-personal__actions">
          {editing ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={save}>Save changes</button>
            </>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(true)}>✎ Edit</button>
          )}
        </div>
      </div>
      <div className="ua-cp-personal__badges">
        <span className={`ua-cp-tier-badge ua-cp-tier-badge--${tierBadgeClass(currentTier)}`} style={tierBadgeTone}>{displayTierLabel}</span>
        {tierActions.canConvert ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--up" title={tierActions.convertTitle} onClick={convertTier}>
            {tierActions.convertLabel}
          </button>
        ) : null}
        {tierActions.canDowngrade ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--down" title={tierActions.downgradeTitle} onClick={downgradeTier}>
            {tierActions.downgradeLabel}
          </button>
        ) : null}
        {tierConverted ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--undo" title="Undo this manual change" onClick={revertTier}>
            <span className="ua-cp-tier-action__manual">Manual</span>
            <span className="ua-cp-tier-action__sep" aria-hidden="true">·</span>
            <span className="ua-cp-tier-action__undo">undo</span>
          </button>
        ) : null}
        <span className="ua-cp-status-badge"><span className="ua-cp-status-badge__dot" />{user.status || "Active"}</span>
      </div>

      <div className="ua-cp-personal__avail-card">
        <div className="ua-cp-personal__avail-head">
          <h3 className="ua-cp-personal__avail-title">Submitted at onboarding</h3>
          <span className="ua-cp-personal__avail-count">
            {availability.availableCount}/{availability.totalCount} available
          </span>
        </div>
        <div className="ua-cp-personal__avail-grid">
          {availability.items.map((item) => (
            <div
              key={item.key}
              className={`ua-cp-avail-chip${item.available ? " ua-cp-avail-chip--yes" : " ua-cp-avail-chip--no"}`}
              title={item.available ? item.display : "Not submitted"}
            >
              <span className="ua-cp-avail-chip__mark" aria-hidden="true">{item.available ? "✓" : "–"}</span>
              <span className="ua-cp-avail-chip__label">{item.label}</span>
            </div>
          ))}
        </div>
        {user?.paidOnboardingStepStatus ? (
          <div className="ua-cp-personal__steps">
            <div className="ua-cp-personal__steps-label">Paid onboarding steps</div>
            <div className="ua-cp-personal__steps-grid">
              {PAID_ONBOARDING_STATUS_KEYS.map((key) => {
                const status = stepStatus[key] || "pending";
                return (
                  <div
                    key={key}
                    className={`ua-cp-step-chip ua-cp-step-chip--${status}`}
                  >
                    <span>{PAID_ONBOARDING_STEP_LABELS[key] || key}</span>
                    <strong>{formatStepStatus(status)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="ua-cp-personal__card">
        {fields.map((f) => {
          const val = f.value ?? form[f.key] ?? "";
          const empty = !String(val || "").trim();
          return (
            <div key={f.label} className={`ua-cp-field${empty ? " ua-cp-field--empty" : ""}`}>
              <span className="ua-cp-field__label">{f.label}</span>
              {editing && f.editable ? (
                <input className="ua-cp-field__input" value={val} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
              ) : (
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
