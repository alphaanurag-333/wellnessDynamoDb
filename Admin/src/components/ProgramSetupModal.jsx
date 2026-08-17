import { useEffect, useMemo, useState } from "react";
import {
  APP_HEAL_PERIODS,
  DISCOUNT_SLABS,
  VALIDITY_PERIODS,
} from "../data/configDetailData.js";
import { discountedPrice, formatRupee } from "../data/exchangeData.js";

function slabLabel(slab) {
  return `${slab.pct}% · ${slab.label}`;
}

export function ProgramSetupModal({
  open,
  onClose,
  onSave,
  program,
  client,
  showAppHeal = true,
  discountSlabs = DISCOUNT_SLABS,
  appHealPeriods = APP_HEAL_PERIODS,
  validityPeriods = VALIDITY_PERIODS,
  coaches = [],
  assistants = [],
  saving = false,
}) {
  const [wellnessCoachId, setWellnessCoachId] = useState("");
  const [assistantWcId, setAssistantWcId] = useState("");
  const [discountIdx, setDiscountIdx] = useState(0);
  const [appHealIdx, setAppHealIdx] = useState(0);
  const [linkValidityIdx, setLinkValidityIdx] = useState(0);

  const coachAssistants = useMemo(
    () => assistants.filter((row) => String(row.wellnessCoachId) === String(wellnessCoachId)),
    [assistants, wellnessCoachId],
  );

  useEffect(() => {
    if (!open) return;
    const preferredCoach =
      coaches.find((row) => String(row.id) === String(client?.parentCoachId)) || coaches[0];
    setWellnessCoachId(preferredCoach?.id || "");
    const preferredAssistant =
      assistants.find((row) => String(row.id) === String(client?.assignedCoachId)) || null;
    setAssistantWcId(preferredAssistant?.id || "");
    setDiscountIdx(0);
    setAppHealIdx(0);
    setLinkValidityIdx(0);
  }, [open, program?.id, client?.id, client?.parentCoachId, client?.assignedCoachId, coaches, assistants]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  if (!open || !program || !client) return null;

  const discount = discountSlabs[discountIdx] ?? discountSlabs[0] ?? { pct: 0, label: "none" };
  const netPayable = discountedPrice(program.amount, discount.pct);

  function handleCoachChange(id) {
    setWellnessCoachId(id);
    setAssistantWcId("");
  }

  async function handleSave() {
    if (!wellnessCoachId) return;
    await onSave({
      program,
      client,
      wellnessCoachId,
      assistantCoachId: assistantWcId || null,
      discount,
      appHealValidity: showAppHeal ? appHealPeriods[appHealIdx] : null,
      linkValidity: validityPeriods[linkValidityIdx],
      netPayable,
    });
  }

  return (
    <div
      className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <div
        className="ua-cfg-setup-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-setup-title"
      >
        <div className="ua-cfg-setup-modal__head">
          <div className="ua-cfg-setup-modal__intro">
            <span className="ua-cfg-setup-modal__icon" aria-hidden="true" />
            <div>
              <h2 id="cfg-setup-title" className="ua-cfg-setup-modal__title">
                {program.name}
              </h2>
              <p className="ua-cfg-setup-modal__sub">
                Set the discount and link validity, then save.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ua-cfg-setup-modal__close"
            aria-label="Close setup"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="ua-cfg-setup-modal__amount">
          <span className="ua-cfg-setup-modal__amount-label">Amount</span>
          <strong className="ua-cfg-setup-modal__amount-value">
            {formatRupee(program.amount)}
          </strong>
          <span className="ua-cfg-setup-modal__auto">Auto</span>
        </div>

        <fieldset className="ua-cfg-setup-modal__raised">
          <legend className="ua-cfg-setup-modal__legend">Raised by</legend>
          <div className="ua-cfg-setup-modal__raised-grid">
            <label className="ua-cfg-setup-modal__field">
              <span className="ua-cfg-setup-modal__label">Wellness Coach</span>
              <select
                className="ua-cfg-setup-modal__select"
                value={wellnessCoachId}
                onChange={(event) => handleCoachChange(event.target.value)}
              >
                <option value="">Choose a coach…</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ua-cfg-setup-modal__field">
              <span className="ua-cfg-setup-modal__label">Assistant WC</span>
              <select
                className="ua-cfg-setup-modal__select"
                value={assistantWcId}
                onChange={(event) => setAssistantWcId(event.target.value)}
              >
                <option value="">Not involved</option>
                {coachAssistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="ua-cfg-setup-modal__hint">
            Admin can attribute this to any coach and their assistant.
          </p>
        </fieldset>

        <label className="ua-cfg-setup-modal__field ua-cfg-setup-modal__field--block">
          <span className="ua-cfg-setup-modal__label">Discount</span>
          <select
            className="ua-cfg-setup-modal__select"
            value={discountIdx}
            onChange={(event) => setDiscountIdx(Number(event.target.value))}
          >
            {discountSlabs.map((slab, index) => (
              <option key={`${slab.pct}-${slab.label}`} value={index}>
                {slabLabel(slab)}
              </option>
            ))}
          </select>
        </label>

        {showAppHeal ? (
          <label className="ua-cfg-setup-modal__field ua-cfg-setup-modal__field--block">
            <span className="ua-cfg-setup-modal__label">App Heal feature validity</span>
            <select
              className="ua-cfg-setup-modal__select"
              value={appHealIdx}
              onChange={(event) => setAppHealIdx(Number(event.target.value))}
            >
              {appHealPeriods.map((period, index) => (
                <option key={period} value={index}>
                  {period}
                </option>
              ))}
            </select>
            <span className="ua-cfg-setup-modal__hint">
              Periods are managed by admin in Energy Exchange.
            </span>
          </label>
        ) : null}

        <label className="ua-cfg-setup-modal__field ua-cfg-setup-modal__field--block">
          <span className="ua-cfg-setup-modal__label">Link validity</span>
          <select
            className="ua-cfg-setup-modal__select"
            value={linkValidityIdx}
            onChange={(event) => setLinkValidityIdx(Number(event.target.value))}
          >
            {validityPeriods.map((period, index) => (
              <option key={period} value={index}>
                {period}
              </option>
            ))}
          </select>
        </label>

        <div className="ua-cfg-setup-modal__net">
          <span className="ua-cfg-setup-modal__net-label">Net payable</span>
          <strong className="ua-cfg-setup-modal__net-value">{formatRupee(netPayable)}</strong>
        </div>

        <div className="ua-cfg-setup-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={handleSave}
            disabled={saving || !wellnessCoachId}
          >
            {saving ? "Triggering…" : "Save & trigger in app"}
          </button>
        </div>
      </div>
    </div>
  );
}
