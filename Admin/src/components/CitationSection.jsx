import { useCallback, useEffect, useRef, useState } from "react";
import { getCitation, saveCitation } from "../api/citationApi.js";

const EMPTY = {
  enabled: true,
};

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

export function CitationSection({
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
      const next = await getCitation();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
      onLocalChange?.({ hasLocalChanges: false });
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load citation setting");
    } finally {
      setLoading(false);
    }
  }, [onLocalChange, onToast, setSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function persist() {
    const enabled = Boolean((settingsRef.current || EMPTY).enabled);
    setBusy(true);
    try {
      const next = await saveCitation({ enabled });
      const resolved = next || { enabled };
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

  const enabled = Boolean(settings?.enabled);
  const dirty = enabled !== Boolean(saved.enabled);

  useEffect(() => {
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [dirty, onLocalChange]);

  return (
    <div className="ua-cfg-lang">
      {dirty ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save to the app, or refresh to discard.
        </p>
      ) : null}

      <Panel
        title="Citation"
        subtitle={
          loading
            ? "Loading citation setting…"
            : "Controls whether citations are shown in the client app"
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching citation from App Config…</p>
        ) : (
          <div className="ua-cfg-lang-row">
            <div>
              <div className="ua-cfg-lang-row__name">Citation status</div>
              <div className="ua-cfg-lang-row__note">
                Sent to clients as <code>citation_enabled</code> on the public app config
              </div>
            </div>
            <div className="ua-cfg-lang-row__side">
              <span className="ua-cfg-lang-row__state">{enabled ? "Active" : "Inactive"}</span>
              <button
                type="button"
                className={`ua-toggle${enabled ? " ua-toggle--on" : ""}`}
                aria-pressed={enabled}
                aria-label="Citation active"
                disabled={busy}
                onClick={() => setSettings((prev) => ({ ...(prev || EMPTY), enabled: !enabled }))}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
