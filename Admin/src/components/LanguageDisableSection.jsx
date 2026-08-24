import { useCallback, useEffect, useRef, useState } from "react";
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

export function LanguageDisableSection({
  hindiOn,
  setHindiOn,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const [loading, setLoading] = useState(true);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const savedSnapshotRef = useRef("");
  const hindiOnRef = useRef(hindiOn);

  hindiOnRef.current = hindiOn;

  const syncLocalDirty = useCallback((next) => {
    const dirty = String(Boolean(next)) !== savedSnapshotRef.current;
    setHasLocalChanges(dirty);
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [onLocalChange]);

  const applySaved = useCallback((next) => {
    const value = Boolean(next);
    setHindiOn(value);
    savedSnapshotRef.current = String(value);
    setHasLocalChanges(false);
    onLocalChange?.({ hasLocalChanges: false });
  }, [onLocalChange, setHindiOn]);

  const applySavedRef = useRef(applySaved);
  applySavedRef.current = applySaved;

  const loadLanguage = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppLanguage();
      applySaved(next);
    } catch (error) {
      onToast(error?.message || "Failed to load language setting");
      applySaved(false);
    } finally {
      setLoading(false);
    }
  }, [applySaved, onToast]);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => {
      const saved = await saveAppLanguage(hindiOnRef.current);
      applySavedRef.current(saved);
      return saved;
    });
  }, [registerPublishHandler]);

  function toggleHindi() {
    if (loading) return;
    const next = !hindiOn;
    setHindiOn(next);
    syncLocalDirty(next);
  }

  return (
    <div className="ua-cfg-lang">
      {hasLocalChanges ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save to the site, or refresh to discard.
        </p>
      ) : null}
      <Panel
        title="Languages"
        subtitle={
          loading
            ? "Loading language setting…"
            : "English stays on. Hindi follows App Config multi-language. Edits stay local until you publish."
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
                  disabled={loading}
                  onClick={toggleHindi}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
