import { useEffect, useState } from "react";
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
  PAID_ONBOARDING_STATUS_KEYS,
  PAID_ONBOARDING_STEP_LABELS,
  moveUserToMaintenance,
  moveUserToSeek,
  moveMaintenanceUserToHeal,
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

export function PersonalDetailsSection({ user, onToast, onUserUpdated }) {
  const [editing, setEditing] = useState(false);
  const [tierBusy, setTierBusy] = useState(false);
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

  const currentTier = normalizeTier(user.tier);
  const tierActions = getTierActions(currentTier, user.ageDays ?? 30);
  const tierBadgeTone = tierBadgeStyle(currentTier);
  const displayTierLabel = tierLabel(currentTier);
  const stepStatus = user?.paidOnboardingStepStatus || {};
  const userId = String(user?.id || "").trim();

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

  async function convertTier() {
    if (!tierActions.canConvert || !userId || tierBusy) return;
    if (currentTier !== "Seek to Heal") {
      onToast("Upgrade this client from the users list conversion flow");
      return;
    }
    setTierBusy(true);
    try {
      const updated = await moveUserToMaintenance(userId);
      onUserUpdated?.(updated);
      onToast(`${user.name} moved to MAINTENANCE`);
    } catch (err) {
      onToast(err?.message || "Could not move user to maintenance");
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

  return (
    <div className="ua-cp-section ua-cp-personal">
      <div className="ua-cp-personal__head">
        <div className="ua-cp-personal__head-copy">
          <h2 className="ua-cp-personal__title">Personal details</h2>
          <p className="ua-cp-personal__email">{user.email}</p>
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
        {tierActions.canDowngrade ? (
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

      {user?.paidOnboardingStepStatus ? (
        <div className="ua-cp-personal__avail-card">
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
        </div>
      ) : null}

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
