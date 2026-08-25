import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_MESSAGE,
  MESSAGE_MAX,
  NUMBER_MAX,
  getWhatsappSupport,
  saveWhatsappSupport,
} from "../api/whatsappSupportApi.js";

const EMPTY = {
  enabled: false,
  number: "",
  message: DEFAULT_MESSAGE,
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

function Field({ id, label, required, value, max, hint, children }) {
  return (
    <label className="ua-cfg-consult-field" htmlFor={id}>
      <span className="ua-cfg-consult-field__label">
        {label}
        {required ? <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em> : null}
      </span>
      {children}
      {hint ? <span className="ua-cfg-panel__sub" style={{ marginTop: 6 }}>{hint}</span> : null}
      <span className="ua-cfg-consult-field__count">
        {String(value || "").length}/{max}
      </span>
    </label>
  );
}

export function WhatsappSupportSection({
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
      const next = await getWhatsappSupport();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
      onLocalChange?.({ hasLocalChanges: false });
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load WhatsApp support settings");
    } finally {
      setLoading(false);
    }
  }, [onLocalChange, onToast, setSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function patch(next) {
    setSettings((prev) => ({ ...(prev || EMPTY), ...next }));
  }

  async function persist() {
    const current = settingsRef.current || EMPTY;
    const number = String(current.number || "").trim();
    const message = String(current.message || "").trim();
    const enabled = Boolean(current.enabled);

    if (enabled && !number.replace(/\D/g, "")) {
      throw new Error("Enter a WhatsApp number (with country code) before enabling");
    }

    setBusy(true);
    try {
      const next = await saveWhatsappSupport({
        enabled,
        number,
        message: message || DEFAULT_MESSAGE,
      });
      const resolved = next || { enabled, number, message: message || DEFAULT_MESSAGE };
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
    Boolean(settings?.enabled) !== Boolean(saved.enabled)
    || String(settings?.number || "") !== String(saved.number || "")
    || String(settings?.message || "") !== String(saved.message || "");

  useEffect(() => {
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [dirty, onLocalChange]);

  const enabled = Boolean(settings?.enabled);

  return (
    <div className="ua-cfg-lang">
      {dirty ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save to the app, or refresh to discard.
        </p>
      ) : null}

      <Panel
        title="WhatsApp support"
        subtitle={
          loading
            ? "Loading WhatsApp support setting…"
            : "Controls the Help & Support drawer button in the mobile app. Opens WhatsApp with your number and prefilled message."
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching WhatsApp support from App Config…</p>
        ) : (
          <>
            <div className="ua-cfg-lang-row">
              <div>
                <div className="ua-cfg-lang-row__name">Show in app</div>
                <div className="ua-cfg-lang-row__note">
                  Help & Support appears in the drawer when enabled
                </div>
              </div>
              <div className="ua-cfg-lang-row__side">
                <span className="ua-cfg-lang-row__state">{enabled ? "Enabled" : "Disabled"}</span>
                <button
                  type="button"
                  className={`ua-toggle${enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={enabled}
                  aria-label="WhatsApp support in app"
                  disabled={busy}
                  onClick={() => patch({ enabled: !enabled })}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>

            <div className="ua-cfg-consult__grid" style={{ marginTop: 16 }}>
              <Field
                id="support-whatsapp-number"
                label="WhatsApp number"
                required={enabled}
                value={settings?.number}
                max={NUMBER_MAX}
                hint="Include country code, e.g. 919876543210 (no + or spaces needed)"
              >
                <input
                  id="support-whatsapp-number"
                  className="ua-cfg-pgw-field__input"
                  type="tel"
                  inputMode="tel"
                  maxLength={NUMBER_MAX}
                  value={settings?.number || ""}
                  disabled={busy}
                  placeholder="919876543210"
                  onChange={(event) =>
                    patch({ number: event.target.value.replace(/[^\d+]/g, "").slice(0, NUMBER_MAX) })
                  }
                />
              </Field>

              <Field
                id="support-whatsapp-message"
                label="Message template"
                value={settings?.message}
                max={MESSAGE_MAX}
                hint="Prefilled when the user taps Help & Support"
              >
                <textarea
                  id="support-whatsapp-message"
                  className="ua-cfg-pgw-field__input"
                  rows={4}
                  maxLength={MESSAGE_MAX}
                  value={settings?.message || ""}
                  disabled={busy}
                  placeholder={DEFAULT_MESSAGE}
                  onChange={(event) =>
                    patch({ message: event.target.value.slice(0, MESSAGE_MAX) })
                  }
                />
              </Field>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
