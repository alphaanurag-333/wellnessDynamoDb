import { useCallback, useEffect, useState } from "react";
import {
  CONSULTANCY_FIELD_MAX,
  TAX_TYPE_OPTIONS,
  clipField,
  getConsultancyAmount,
  parseMoneyField,
  parseTaxPercent,
  saveConsultancyAmount,
} from "../api/consultancyAmountApi.js";

const EMPTY = {
  consultancyAmount: "",
  taxType: "inclusive",
  taxValue: "",
  referralDiscount: "",
};

function Field({ id, label, required, value, children, max = CONSULTANCY_FIELD_MAX }) {
  return (
    <label className="ua-cfg-consult-field" htmlFor={id}>
      <span className="ua-cfg-consult-field__label">
        {label}
        {required ? <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em> : null}
      </span>
      {children}
      <span className="ua-cfg-consult-field__count">
        {String(value || "").length}/{max}
      </span>
    </label>
  );
}

export function ConsultancyAmountSection({ settings, setSettings, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(EMPTY);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getConsultancyAmount();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load consultancy settings");
    } finally {
      setLoading(false);
    }
  }, [onToast, setSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function patch(next) {
    setSettings((prev) => ({ ...prev, ...next }));
  }

  async function persist() {
    const consultancyAmount = parseMoneyField(settings?.consultancyAmount);
    const taxValue = parseTaxPercent(settings?.taxValue);
    const taxType = String(settings?.taxType || "").trim().toLowerCase();
    const referralDiscount = String(settings?.referralDiscount || "").trim()
      ? parseMoneyField(settings.referralDiscount)
      : "0";

    if (!consultancyAmount) {
      onToast("Enter a consultancy amount");
      return;
    }
    if (taxType !== "inclusive" && taxType !== "exclusive") {
      onToast("Select a tax type");
      return;
    }
    if (!taxValue) {
      onToast("Enter a tax value between 0 and 100");
      return;
    }
    if (String(settings?.referralDiscount || "").trim() && referralDiscount === "") {
      onToast("Enter a valid referral discount amount");
      return;
    }

    const payload = {
      consultancyAmount,
      taxType,
      taxValue,
      referralDiscount: referralDiscount || "0",
    };

    setBusy(true);
    try {
      const next = await saveConsultancyAmount(payload);
      const resolved = next || payload;
      setSettings(resolved);
      setSaved(resolved);
      onToast("Consultancy settings saved");
    } catch (error) {
      onToast(error?.message || "Failed to save consultancy settings");
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    String(settings?.consultancyAmount || "") !== String(saved.consultancyAmount || "")
    || String(settings?.taxType || "") !== String(saved.taxType || "")
    || String(settings?.taxValue || "") !== String(saved.taxValue || "")
    || String(settings?.referralDiscount || "") !== String(saved.referralDiscount || "");

  return (
    <section className="ua-cfg-panel ua-cfg-consult">
      <p className="ua-cfg-consult__intro">
        Consultancy fee, tax, and referral discount (fixed amount) settings. Inclusive tax is already
        part of the listed price; exclusive tax is calculated and added at checkout.
      </p>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching consultancy settings from App Config…</p>
      ) : (
        <>
          <div className="ua-cfg-consult__grid">
            <Field
              id="consultancy-amount"
              label="Consultancy amount"
              required
              value={settings?.consultancyAmount}
            >
              <input
                id="consultancy-amount"
                className="ua-cfg-pgw-field__input"
                type="text"
                inputMode="decimal"
                maxLength={CONSULTANCY_FIELD_MAX}
                value={settings?.consultancyAmount || ""}
                disabled={busy}
                placeholder="299.00"
                onChange={(event) => patch({ consultancyAmount: clipField(event.target.value) })}
              />
            </Field>

            <label className="ua-cfg-consult-field" htmlFor="consultancy-tax-type">
              <span className="ua-cfg-consult-field__label">
                Tax type
                <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em>
              </span>
              <select
                id="consultancy-tax-type"
                className="ua-cfg-pgw-field__input"
                value={settings?.taxType || "inclusive"}
                disabled={busy}
                onChange={(event) => patch({ taxType: event.target.value })}
              >
                {TAX_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Field
              id="consultancy-tax-value"
              label="Tax value (%)"
              required
              value={settings?.taxValue}
            >
              <input
                id="consultancy-tax-value"
                className="ua-cfg-pgw-field__input"
                type="text"
                inputMode="decimal"
                maxLength={CONSULTANCY_FIELD_MAX}
                value={settings?.taxValue || ""}
                disabled={busy}
                placeholder="5"
                onChange={(event) => patch({ taxValue: clipField(event.target.value) })}
              />
            </Field>

            <Field
              id="consultancy-referral-discount"
              label="Referral discount amount"
              value={settings?.referralDiscount}
            >
              <input
                id="consultancy-referral-discount"
                className="ua-cfg-pgw-field__input"
                type="text"
                inputMode="decimal"
                maxLength={CONSULTANCY_FIELD_MAX}
                value={settings?.referralDiscount || ""}
                disabled={busy}
                placeholder="200.00"
                onChange={(event) => patch({ referralDiscount: clipField(event.target.value) })}
              />
            </Field>
          </div>

          <div className="ua-cfg-consult__foot">
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-consult__save"
              disabled={busy || !dirty}
              onClick={persist}
            >
              {busy ? "Saving..." : "Save settings"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
