import { useEffect, useMemo, useState } from "react";
import {
  APP_HEAL_PERIODS,
  DISCOUNT_SLABS,
  VALIDITY_PERIODS,
} from "../data/configDetailData.js";
import { discountedPrice, formatRupee } from "../data/exchangeData.js";
import { AWC_DEFAULT, WC_OPTIONS } from "../data/usersData.js";

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
}) {
  const coaches = useMemo(
    () => WC_OPTIONS.filter((name) => name !== "— Unassigned —"),
    [],
  );

  const [wellnessCoach, setWellnessCoach] = useState("Anita Rao");
  const [assistantWc, setAssistantWc] = useState("Not involved");
  const [discountIdx, setDiscountIdx] = useState(0);
  const [appHealIdx, setAppHealIdx] = useState(0);
  const [linkValidityIdx, setLinkValidityIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setWellnessCoach("Anita Rao");
    setAssistantWc("Not involved");
    setDiscountIdx(0);
    setAppHealIdx(0);
    setLinkValidityIdx(0);
  }, [open, program?.id]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !program || !client) return null;

  const discount = DISCOUNT_SLABS[discountIdx] ?? DISCOUNT_SLABS[0];
  const netPayable = discountedPrice(program.amount, discount.pct);

  function handleCoachChange(name) {
    setWellnessCoach(name);
    setAssistantWc(AWC_DEFAULT[name] || "Not involved");
  }

  function handleSave() {
    onSave({
      program,
      client,
      wellnessCoach,
      assistantWc,
      discount,
      appHealValidity: showAppHeal ? APP_HEAL_PERIODS[appHealIdx] : null,
      linkValidity: VALIDITY_PERIODS[linkValidityIdx],
      netPayable,
    });
    onClose();
  }

  return (
    <div
      className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer"
      onClick={onClose}
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
                value={wellnessCoach}
                onChange={(event) => handleCoachChange(event.target.value)}
              >
                {coaches.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ua-cfg-setup-modal__field">
              <span className="ua-cfg-setup-modal__label">Assistant WC</span>
              <select
                className="ua-cfg-setup-modal__select"
                value={assistantWc}
                onChange={(event) => setAssistantWc(event.target.value)}
              >
                <option value="Not involved">Not involved</option>
                {Object.values(AWC_DEFAULT).map((name) => (
                  <option key={name} value={name}>
                    {name}
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
            {DISCOUNT_SLABS.map((slab, index) => (
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
              {APP_HEAL_PERIODS.map((period, index) => (
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
            {VALIDITY_PERIODS.map((period, index) => (
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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={handleSave}>
            Save &amp; trigger in app
          </button>
        </div>
      </div>
    </div>
  );
}
