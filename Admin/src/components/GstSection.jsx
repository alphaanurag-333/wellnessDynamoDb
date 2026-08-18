import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_TAX_VALUE, getAppGst, parseTaxValue, saveAppGst } from "../api/gstApi.js";

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function GstSection({ gstOn, setGstOn, gstPercent, setGstPercent, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftPercent, setDraftPercent] = useState(gstPercent || DEFAULT_TAX_VALUE);
  const savedPercentRef = useRef(gstPercent || DEFAULT_TAX_VALUE);

  const loadGst = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppGst();
      const rate = next.taxValue || DEFAULT_TAX_VALUE;
      savedPercentRef.current = rate;
      setGstPercent(rate);
      setDraftPercent(rate);
      setGstOn(Boolean(next.gstOn));
    } catch (error) {
      onToast(error?.message || "Failed to load GST setting");
      setGstOn(false);
    } finally {
      setLoading(false);
    }
  }, [onToast, setGstOn, setGstPercent]);

  useEffect(() => {
    loadGst();
  }, [loadGst]);

  async function persist(nextOn, taxValue, successMessage) {
    setBusy(true);
    try {
      const saved = await saveAppGst(nextOn, taxValue);
      const rate = saved.taxValue || DEFAULT_TAX_VALUE;
      savedPercentRef.current = rate;
      setGstPercent(rate);
      setDraftPercent(rate);
      setGstOn(Boolean(saved.gstOn));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save GST setting");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleGst() {
    if (busy) return;
    const next = !gstOn;
    const rate = parseTaxValue(draftPercent) || savedPercentRef.current;
    setGstOn(next);
    const ok = await persist(
      next,
      rate,
      next ? "GST collection enabled" : "GST collection disabled"
    );
    if (!ok) setGstOn(!next);
  }

  async function savePercent() {
    if (busy) return;
    const rate = parseTaxValue(draftPercent);
    if (!rate) {
      onToast("Enter a GST percentage between 0.01 and 100");
      setDraftPercent(savedPercentRef.current);
      return;
    }
    if (rate === savedPercentRef.current) {
      setDraftPercent(rate);
      return;
    }
    await persist(gstOn, rate, `GST percentage set to ${rate}%`);
  }

  const note = gstOn
    ? "Client pays GST at checkout"
    : "IRW absorbs GST · price shown is final";
  const percentDirty = parseTaxValue(draftPercent) !== savedPercentRef.current;

  return (
    <Panel
      title="GST collection"
      subtitle={
        loading
          ? "Loading GST setting…"
          : "On adds GST at checkout. Off keeps the listed price final (inclusive). Set the GST percentage applied to checkout."
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching GST setting from App Config…</p>
      ) : (
        <>
          <div className="ua-cfg-gst-row">
            <span className="ua-cfg-gst-row__icon" aria-hidden="true">📜</span>
            <div>
              <div className="ua-cfg-gst-row__name">GST collection</div>
              <div className="ua-cfg-gst-row__note">{note}</div>
            </div>
            <button
              type="button"
              className={`ua-toggle${gstOn ? " ua-toggle--on" : ""}`}
              aria-pressed={gstOn}
              aria-label="GST collection"
              disabled={busy}
              onClick={toggleGst}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>

          <div className="ua-cfg-gst-percent">
            <label className="ua-cfg-gst-percent__field" htmlFor="app-gst-percent">
              <span className="ua-cfg-gst-percent__label">GST percentage</span>
              <span className="ua-cfg-gst-percent__note">
                Applied at checkout when GST is on, and used to reverse-calculate absorbed GST when off.
              </span>
            </label>
            <div className="ua-cfg-gst-percent__row">
              <input
                id="app-gst-percent"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                inputMode="decimal"
                className="ua-cfg-gst-percent__input"
                value={draftPercent}
                disabled={busy}
                aria-label="GST percentage"
                onChange={(event) => setDraftPercent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    savePercent();
                  }
                }}
              />
              <span className="ua-cfg-gst-percent__suffix">%</span>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                disabled={busy || !percentDirty}
                onClick={savePercent}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
