import { useState } from "react";
import { AtAGlanceSection } from "./AtAGlanceSection.jsx";
import { BodyAnalyticsSection } from "./BodyAnalyticsSection.jsx";
import { InternalParametersSection } from "./InternalParametersSection.jsx";
import { LaunchSection } from "./LaunchSection.jsx";
import { FoodSection } from "./FoodSection.jsx";
import { BmsSection } from "./BmsSection.jsx";
import { NutritionsSection } from "./NutritionsSection.jsx";
import { getTierActions } from "../../data/userDetailData.js";
import { tierBadgeClass, tierBadgeStyle, tierLabel, normalizeTier } from "../../data/usersData.js";

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

  const currentTier = normalizeTier(manualTier ?? user.tier);
  const tierActions = getTierActions(currentTier, user.ageDays ?? 30);
  const tierBadgeTone = tierBadgeStyle(currentTier);
  const displayTierLabel = tierLabel(currentTier);
  const tierConverted = manualTier !== null;

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
    { key: "termsIp", label: "Terms & conditions IP", value: user.termsIp, editable: false },
    { key: "termsAccepted", label: "Terms & conditions accepted", value: user.termsAccepted, editable: false },
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
      <div className="ua-cp-personal__card">
        {fields.map((f) => {
          const val = f.value ?? form[f.key] ?? "";
          return (
            <div key={f.label} className="ua-cp-field">
              <span className="ua-cp-field__label">{f.label}</span>
              {editing && f.editable ? (
                <input className="ua-cp-field__input" value={val} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
              ) : (
                <span className="ua-cp-field__value">{val}</span>
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
