import { useCallback, useEffect, useRef, useState } from "react";
import { getAppPaymentGateways, saveAppPaymentGateways } from "../api/paymentGatewayApi.js";
import {
  PAYMENT_GATEWAY_MODES,
  createDefaultCashfreeEntry,
  createDefaultGateways,
} from "../data/configDetailData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

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

function emptyModeSafe() {
  return { appId: "", secretKey: "", webhookSecret: "" };
}

function cloneEntry(entry) {
  const src = entry || createDefaultCashfreeEntry();
  return {
    active: true,
    mode: src.mode === "live" ? "live" : "uat",
    uat: { ...(src.uat || emptyModeSafe()) },
    live: { ...(src.live || emptyModeSafe()) },
  };
}

function entryEquals(a, b) {
  const left = cloneEntry(a);
  const right = cloneEntry(b);
  return (
    left.mode === right.mode &&
    left.uat.appId === right.uat.appId &&
    left.uat.secretKey === right.uat.secretKey &&
    left.uat.webhookSecret === right.uat.webhookSecret &&
    left.live.appId === right.live.appId &&
    left.live.secretKey === right.live.secretKey &&
    left.live.webhookSecret === right.live.webhookSecret
  );
}

function modeLabel(modeId) {
  return modeId === "live" ? "Live" : "UAT";
}

function SecretInput({ value, disabled, placeholder, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="ua-cfg-pgw-secret">
      <input
        type={visible ? "text" : "password"}
        className="ua-cfg-pgw-field__input"
        value={value}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
      <button
        type="button"
        className="ua-cfg-pgw-secret__toggle"
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide secret" : "Show secret"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function ModeCredentialFields({ label, modeId, values, disabled, required, onChange }) {
  return (
    <div className="ua-cfg-pgw-mode-block">
      <div className="ua-cfg-pgw-mode-block__title">{label}</div>
      <div className="ua-cfg-pgw-card__fields ua-cfg-pgw-card__fields--stack">
        <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
          <span className="ua-cfg-pgw-field__label">App ID{required ? " *" : ""}</span>
          <input
            type="text"
            className="ua-cfg-pgw-field__input"
            value={values.appId}
            autoComplete="off"
            disabled={disabled}
            placeholder={modeId === "live" ? "Production App ID" : "Sandbox App ID"}
            onChange={(event) => onChange(modeId, { appId: event.target.value })}
            spellCheck={false}
          />
        </label>
        <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
          <span className="ua-cfg-pgw-field__label">Secret key{required ? " *" : ""}</span>
          <SecretInput
            value={values.secretKey}
            disabled={disabled}
            placeholder="••••••••"
            onChange={(secretKey) => onChange(modeId, { secretKey })}
          />
        </label>
        <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
          <span className="ua-cfg-pgw-field__label">Webhook secret (optional)</span>
          <SecretInput
            value={values.webhookSecret}
            disabled={disabled}
            placeholder="whsec_…"
            onChange={(webhookSecret) => onChange(modeId, { webhookSecret })}
          />
        </label>
      </div>
    </div>
  );
}

export function PaymentGatewaySection({ gateways, setGateways, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(() => cloneEntry(gateways?.cashfree));
  const [pendingMode, setPendingMode] = useState(null);
  const savedRef = useRef(cloneEntry(gateways?.cashfree));

  const applyLoaded = useCallback(
    (nextGateways) => {
      const next = cloneEntry(nextGateways?.cashfree);
      savedRef.current = next;
      setDraft(next);
      setGateways({ cashfree: next });
    },
    [setGateways],
  );

  const loadGateways = useCallback(async () => {
    setLoading(true);
    try {
      const { gateways: next } = await getAppPaymentGateways();
      applyLoaded(next);
    } catch (error) {
      onToast(error?.message || "Failed to load payment gateways");
      applyLoaded(createDefaultGateways());
    } finally {
      setLoading(false);
    }
  }, [applyLoaded, onToast]);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  const dirty = !entryEquals(draft, savedRef.current);
  const mode = draft.mode === "live" ? "live" : "uat";

  function updateModeCredentials(modeId, patch) {
    setDraft((prev) => {
      const current = cloneEntry(prev);
      return {
        ...current,
        [modeId]: { ...(current[modeId] || emptyModeSafe()), ...patch },
      };
    });
  }

  function validateModeCredentials(entry, modeId) {
    const creds = entry?.[modeId] || emptyModeSafe();
    if (!creds.appId.trim() || !creds.secretKey.trim()) {
      return `${modeLabel(modeId)} App ID and secret key are required`;
    }
    return null;
  }

  async function persist(nextEntry, successMessage) {
    setBusy(true);
    try {
      const payload = { cashfree: cloneEntry(nextEntry) };
      const saved = await saveAppPaymentGateways(payload);
      applyLoaded(saved.gateways);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save payment gateways");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    if (busy) return;
    const next = cloneEntry(draft);

    const uatError = validateModeCredentials(next, "uat");
    if (uatError) {
      onToast(uatError);
      return;
    }

    const live = next.live || emptyModeSafe();
    const livePartial = Boolean(
      live.appId.trim() || live.secretKey.trim() || live.webhookSecret.trim(),
    );
    if (next.mode === "live" || livePartial) {
      const liveError = validateModeCredentials(next, "live");
      if (liveError) {
        onToast(liveError);
        return;
      }
    }

    await persist(next, "Cashfree credentials saved");
  }

  function requestModeChange(modeId) {
    if (busy || loading) return;
    if (draft.mode === modeId) return;
    const modeError = validateModeCredentials(draft, modeId);
    if (modeError) {
      onToast(`Add ${modeLabel(modeId)} credentials before switching mode`);
      return;
    }
    if (dirty) {
      onToast("Save credential changes before switching mode");
      return;
    }
    setPendingMode(modeId);
  }

  async function confirmModeChange() {
    if (!pendingMode) return;
    const modeId = pendingMode;
    setPendingMode(null);
    const next = { ...cloneEntry(savedRef.current), mode: modeId };
    setDraft(next);
    await persist(next, `Cashfree mode set to ${modeLabel(modeId)}`);
  }

  function cancelModeChange() {
    setPendingMode(null);
  }

  function resetDraft() {
    setDraft(cloneEntry(savedRef.current));
  }

  return (
    <Panel
      title="Cashfree payment gateway"
      subtitle={
        loading
          ? "Loading payment gateway…"
          : "Cashfree is always on. Edit UAT / Live credentials, then save. Mode switch asks for confirmation."
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching gateway settings from App Config…</p>
      ) : (
        <div className="ua-cfg-pgw-grid ua-cfg-pgw-grid--single">
          <div className="ua-cfg-pgw-card ua-cfg-pgw-card--active">
            <div className="ua-cfg-pgw-card__head">
              <div>
                <div className="ua-cfg-pgw-card__name">Cashfree</div>
                <div className="ua-cfg-pgw-card__note">UPI · cards · net banking · wallets</div>
              </div>
              <span className="ua-cfg-pgw-badge">{modeLabel(mode)} mode</span>
            </div>

            <div className="ua-cfg-pgw-mode">
              <span className="ua-cfg-pgw-field__label">Mode</span>
              <div className="ua-cfg-pgw-mode__toggle" role="group" aria-label="Cashfree mode">
                {PAYMENT_GATEWAY_MODES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`ua-cfg-pgw-mode__btn${mode === option.id ? " is-active" : ""}`}
                    disabled={busy}
                    aria-pressed={mode === option.id}
                    onClick={() => requestModeChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="ua-cfg-pgw-mode__hint">
                Switching mode uses that environment for all app payments. You will be asked to confirm.
              </p>
            </div>

            <ModeCredentialFields
              label="UAT (sandbox)"
              modeId="uat"
              values={draft.uat || emptyModeSafe()}
              disabled={busy}
              required
              onChange={updateModeCredentials}
            />
            <ModeCredentialFields
              label="Live (production)"
              modeId="live"
              values={draft.live || emptyModeSafe()}
              disabled={busy}
              required={mode === "live"}
              onChange={updateModeCredentials}
            />

            <div className="ua-cfg-pgw-actions">
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
                disabled={busy || !dirty}
                onClick={resetDraft}
              >
                Reset
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary"
                disabled={busy || !dirty}
                onClick={saveCredentials}
              >
                {busy ? "Saving…" : "Save credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingMode)}
        tag="Payment gateway"
        title={`Switch Cashfree to ${modeLabel(pendingMode)}?`}
        body={
          pendingMode === "live"
            ? "Live credentials will be used for all payment orders. Make sure production keys are correct before continuing."
            : "UAT (sandbox) credentials will be used for all payment orders. Use this for testing only."
        }
        cancelLabel="Cancel"
        confirmLabel={`Use ${modeLabel(pendingMode)}`}
        confirmTone={pendingMode === "live" ? "danger" : "primary"}
        onCancel={cancelModeChange}
        onConfirm={confirmModeChange}
      />
    </Panel>
  );
}
