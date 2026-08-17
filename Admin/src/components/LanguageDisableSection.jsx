import { useCallback, useEffect, useState } from "react";
import { getAppLanguage, saveAppLanguage } from "../api/languageApi.js";

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

export function LanguageDisableSection({ hindiOn, setHindiOn, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadLanguage = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppLanguage();
      setHindiOn(Boolean(next));
    } catch (error) {
      onToast(error?.message || "Failed to load language setting");
      setHindiOn(false);
    } finally {
      setLoading(false);
    }
  }, [onToast, setHindiOn]);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  async function toggleHindi() {
    if (busy) return;
    const next = !hindiOn;
    setHindiOn(next);
    setBusy(true);
    try {
      const saved = await saveAppLanguage(next);
      setHindiOn(Boolean(saved));
      onToast(saved ? "Hindi enabled" : "Hindi disabled");
    } catch (error) {
      setHindiOn(!next);
      onToast(error?.message || "Failed to save language setting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Languages"
      subtitle={
        loading
          ? "Loading language setting…"
          : "English stays on. Hindi follows App Config multi-language."
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching language setting from App Config…</p>
      ) : (
        <>
          <div className="ua-cfg-lang-row">
            <div>
              <div className="ua-cfg-lang-row__name">English</div>
              <div className="ua-cfg-lang-row__note">Always on</div>
            </div>
            <div className="ua-cfg-lang-row__side">
              <span className="ua-cfg-lang-row__state">Enabled</span>
              <span className="ua-cfg-lang-row__lock" title="Locked" aria-hidden="true">🔒</span>
            </div>
          </div>
          <div className="ua-cfg-lang-row">
            <div>
              <div className="ua-cfg-lang-row__name">Hindi</div>
              <div className="ua-cfg-lang-row__note">Can be disabled</div>
            </div>
            <div className="ua-cfg-lang-row__side">
              <span className="ua-cfg-lang-row__state">{hindiOn ? "Enabled" : "Disabled"}</span>
              <button
                type="button"
                className={`ua-toggle${hindiOn ? " ua-toggle--on" : ""}`}
                aria-pressed={hindiOn}
                aria-label="Hindi language"
                disabled={busy}
                onClick={toggleHindi}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
