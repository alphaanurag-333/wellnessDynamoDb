import { useCallback, useEffect, useRef, useState } from "react";
import { getAppGst, saveAppGst } from "../api/gstApi.js";

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

export function GstSection({ gstOn, setGstOn, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const taxValueRef = useRef("18");

  const loadGst = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppGst();
      taxValueRef.current = next.taxValue;
      setGstOn(Boolean(next.gstOn));
    } catch (error) {
      onToast(error?.message || "Failed to load GST setting");
      setGstOn(false);
    } finally {
      setLoading(false);
    }
  }, [onToast, setGstOn]);

  useEffect(() => {
    loadGst();
  }, [loadGst]);

  async function toggleGst() {
    if (busy) return;
    const next = !gstOn;
    setGstOn(next);
    setBusy(true);
    try {
      const saved = await saveAppGst(next, taxValueRef.current);
      taxValueRef.current = saved.taxValue;
      setGstOn(Boolean(saved.gstOn));
      onToast(saved.gstOn ? "GST collection enabled" : "GST collection disabled");
    } catch (error) {
      setGstOn(!next);
      onToast(error?.message || "Failed to save GST setting");
    } finally {
      setBusy(false);
    }
  }

  const note = gstOn
    ? "Client pays GST at checkout"
    : "IRW absorbs GST · price shown is final";

  return (
    <Panel
      title="GST collection"
      subtitle={
        loading
          ? "Loading GST setting…"
          : "On adds GST at checkout. Off keeps the listed price final (inclusive)."
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching GST setting from App Config…</p>
      ) : (
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
            disabled={busy}
            onClick={toggleGst}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
      )}
    </Panel>
  );
}
