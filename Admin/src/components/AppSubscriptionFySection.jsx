import { useCallback, useEffect, useState } from "react";
import {
  FY_DISCOUNT_TIERS,
  FY_START_MONTH_OPTIONS,
  getAppSubscriptionFy,
  saveAppSubscriptionFy,
} from "../api/appSubscriptionFyApi.js";
import { clipField } from "../api/consultancyAmountApi.js";

const EMPTY = {
  monthlyAmount: "",
  fyStartMonth: "4",
  fyDiscounts: { "1": 0, "2": 0, "3": 5, "4": 10 },
};

export function AppSubscriptionFySection({ settings, setSettings, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(EMPTY);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppSubscriptionFy();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load FY subscription settings");
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

  function patchDiscount(key, value) {
    const n = Number(value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    setSettings((prev) => ({
      ...prev,
      fyDiscounts: { ...(prev?.fyDiscounts || {}), [key]: pct },
    }));
  }

  async function persist() {
    setBusy(true);
    try {
      const next = await saveAppSubscriptionFy(settings);
      const resolved = next || settings;
      setSettings(resolved);
      setSaved(resolved);
      onToast("FY app subscription settings saved");
    } catch (error) {
      onToast(error?.message || "Failed to save FY subscription settings");
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    String(settings?.monthlyAmount || "") !== String(saved.monthlyAmount || "")
    || String(settings?.fyStartMonth || "") !== String(saved.fyStartMonth || "")
    || FY_DISCOUNT_TIERS.some(
      (tier) => Number(settings?.fyDiscounts?.[tier.key]) !== Number(saved.fyDiscounts?.[tier.key]),
    );

  return (
    <section className="ua-cfg-panel ua-cfg-consult">
      <p className="ua-cfg-consult__intro">
        App subscriptions are financial-year based (April–March by default). Clients pay the monthly
        rate for remaining months in the current FY (pro-rata), and full 12 months for future FYs.
        These defaults seed each client&apos;s Energy Exchange program.
      </p>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching FY subscription settings from App Config…</p>
      ) : (
        <>
          <div className="ua-cfg-consult__grid">
            <label className="ua-cfg-consult-field" htmlFor="fy-monthly-amount">
              <span className="ua-cfg-consult-field__label">
                Monthly amount (₹)
                <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em>
              </span>
              <input
                id="fy-monthly-amount"
                className="ua-cfg-pgw-field__input"
                type="text"
                inputMode="decimal"
                value={settings?.monthlyAmount || ""}
                disabled={busy}
                placeholder="200"
                onChange={(event) => patch({ monthlyAmount: clipField(event.target.value) })}
              />
            </label>

            <label className="ua-cfg-consult-field" htmlFor="fy-start-month">
              <span className="ua-cfg-consult-field__label">
                FY start month
                <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em>
              </span>
              <select
                id="fy-start-month"
                className="ua-cfg-pgw-field__input"
                value={settings?.fyStartMonth || "4"}
                disabled={busy}
                onChange={(event) => patch({ fyStartMonth: event.target.value })}
              >
                {FY_START_MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ua-cfg-consult__grid" style={{ marginTop: "1rem" }}>
            {FY_DISCOUNT_TIERS.map((tier) => (
              <label key={tier.key} className="ua-cfg-consult-field" htmlFor={`fy-discount-${tier.key}`}>
                <span className="ua-cfg-consult-field__label">{tier.label} discount (%)</span>
                <input
                  id={`fy-discount-${tier.key}`}
                  className="ua-cfg-pgw-field__input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={settings?.fyDiscounts?.[tier.key] ?? 0}
                  disabled={busy}
                  onChange={(event) => patchDiscount(tier.key, event.target.value)}
                />
              </label>
            ))}
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
