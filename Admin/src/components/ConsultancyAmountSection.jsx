import { useCallback, useEffect, useRef, useState } from "react";
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

export function ConsultancyAmountSection({
  settings,
  setSettings,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(EMPTY);
  const settingsRef = useRef(settings);
  const persistRef = useRef(null);

  settingsRef.current = settings;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getConsultancyAmount();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
      onLocalChange?.({ hasLocalChanges: false });
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load consultancy settings");
    } finally {
      setLoading(false);
    }
  }, [onLocalChange, onToast, setSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function patch(next) {
    setSettings((prev) => ({ ...prev, ...next }));
  }

  async function persist() {
    const current = settingsRef.current || EMPTY;
    const consultancyAmount = parseMoneyField(current.consultancyAmount);
    const taxValue = parseTaxPercent(current.taxValue);
    const taxType = String(current.taxType || "").trim().toLowerCase();
    const referralDiscount = String(current.referralDiscount || "").trim()
      ? parseMoneyField(current.referralDiscount)
      : "0";

    if (!consultancyAmount) {
      throw new Error("Enter a consultancy amount");
    }
    if (taxType !== "inclusive" && taxType !== "exclusive") {
      throw new Error("Select a tax type");
    }
    if (!taxValue) {
      throw new Error("Enter a tax value between 0 and 100");
    }
    if (String(current.referralDiscount || "").trim() && referralDiscount === "") {
      throw new Error("Enter a valid referral discount amount");
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
      onLocalChange?.({ hasLocalChanges: false });
      return resolved;
    } finally {
      setBusy(false);
    }
  }

  persistRef.current = persist;

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => persistRef.current());
  }, [registerPublishHandler]);

  const dirty =
    String(settings?.consultancyAmount || "") !== String(saved.consultancyAmount || "")
    || String(settings?.taxType || "") !== String(saved.taxType || "")
    || String(settings?.taxValue || "") !== String(saved.taxValue || "")
    || String(settings?.referralDiscount || "") !== String(saved.referralDiscount || "");

  useEffect(() => {
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [dirty, onLocalChange]);

  return (
    <section className="ua-cfg-panel ua-cfg-consult">
      {dirty ? (
        <p className="ua-cfg-panel__sub ua-cfg-panel__sub--warn">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save, or refresh to discard.
        </p>
      ) : null}
      <p className="ua-cfg-consult__intro">
        Consultancy fee, tax, and referral discount (fixed amount) settings. Inclusive tax is already
        part of the listed price; exclusive tax is calculated and added at checkout. Edits stay local until you publish.
      </p>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching consultancy settings from App Config…</p>
      ) : (
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
      )}
    </section>
  );
}
