import { useCallback, useEffect, useRef, useState } from "react";
import { getAppPaymentGateways, saveAppPaymentGateways } from "../api/paymentGatewayApi.js";
import { PAYMENT_GATEWAY_OPTIONS, createDefaultGateways } from "../data/configDetailData.js";

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

function emptyEntry() {
  return { active: false, keyId: "", keySecret: "", webhookSecret: "", merchantId: "" };
}

export function PaymentGatewaySection({ gateways, setGateways, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const extrasRef = useRef([]);
  const savedRef = useRef(gateways);

  const loadGateways = useCallback(async () => {
    setLoading(true);
    try {
      const { gateways: next, extras } = await getAppPaymentGateways();
      extrasRef.current = extras || [];
      setGateways(next);
      savedRef.current = next;
    } catch (error) {
      onToast(error?.message || "Failed to load payment gateways");
      const fallback = createDefaultGateways();
      extrasRef.current = [];
      setGateways(fallback);
      savedRef.current = fallback;
    } finally {
      setLoading(false);
    }
  }, [onToast, setGateways]);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  async function persist(next, successMessage) {
    setBusy(true);
    try {
      const saved = await saveAppPaymentGateways(next, extrasRef.current);
      extrasRef.current = saved.extras || [];
      setGateways(saved.gateways);
      savedRef.current = saved.gateways;
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save payment gateways");
      setGateways(savedRef.current);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function updateGateway(id, patch) {
    setGateways((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || emptyEntry()), ...patch },
    }));
  }

  async function commitField(id) {
    if (busy) return;
    const current = gateways[id] || emptyEntry();
    const previous = savedRef.current[id] || emptyEntry();
    if (
      current.keyId === previous.keyId &&
      current.keySecret === previous.keySecret &&
      current.webhookSecret === previous.webhookSecret
    ) {
      return;
    }
    await persist(gateways, "Gateway credentials saved");
  }

  async function toggleGateway(id) {
    if (busy) return;
    const current = gateways[id] || emptyEntry();
    const turningOn = !current.active;
    if (turningOn && (!current.keyId.trim() || !current.keySecret.trim())) {
      onToast("Key ID and key secret are required to enable this gateway");
      return;
    }

    const next = { ...gateways };
    PAYMENT_GATEWAY_OPTIONS.forEach((option) => {
      next[option.id] = {
        ...(next[option.id] || emptyEntry()),
        active: option.id === id ? turningOn : false,
      };
    });
    setGateways(next);
    const option = PAYMENT_GATEWAY_OPTIONS.find((entry) => entry.id === id);
    await persist(next, `${option?.name ?? "Gateway"} ${turningOn ? "enabled" : "disabled"}`);
  }

  return (
    <Panel
      title="Payment gateways"
      subtitle={
        loading
          ? "Loading payment gateways…"
          : "Turn a gateway on only when credentials are correct. One active gateway at a time. Saved to App Config."
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching gateway settings from App Config…</p>
      ) : (
        <div className="ua-cfg-pgw-grid">
          {PAYMENT_GATEWAY_OPTIONS.map((option) => {
            const entry = gateways[option.id] || emptyEntry();
            const active = Boolean(entry.active);

            return (
              <div key={option.id} className={`ua-cfg-pgw-card${active ? " ua-cfg-pgw-card--active" : ""}`}>
                <div className="ua-cfg-pgw-card__head">
                  <div>
                    <div className="ua-cfg-pgw-card__name">{option.name}</div>
                    <div className="ua-cfg-pgw-card__note">{option.note}</div>
                  </div>
                  <button
                    type="button"
                    className={`ua-toggle${active ? " ua-toggle--on" : ""}`}
                    aria-pressed={active}
                    aria-label={`${option.name} ${active ? "on" : "off"}`}
                    disabled={busy}
                    onClick={() => toggleGateway(option.id)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>

                <div className="ua-cfg-pgw-card__fields">
                  <label className="ua-cfg-pgw-field">
                    <span className="ua-cfg-pgw-field__label">
                      Key ID{active ? " *" : ""}
                    </span>
                    <input
                      type="text"
                      className="ua-cfg-pgw-field__input"
                      value={entry.keyId}
                      autoComplete="off"
                      disabled={busy}
                      placeholder="pk_… / rzp_… / client id"
                      onChange={(event) => updateGateway(option.id, { keyId: event.target.value })}
                      onBlur={() => commitField(option.id)}
                    />
                  </label>
                  <label className="ua-cfg-pgw-field">
                    <span className="ua-cfg-pgw-field__label">
                      Key secret{active ? " *" : ""}
                    </span>
                    <input
                      type="password"
                      className="ua-cfg-pgw-field__input"
                      value={entry.keySecret}
                      autoComplete="new-password"
                      disabled={busy}
                      placeholder="••••••••"
                      onChange={(event) => updateGateway(option.id, { keySecret: event.target.value })}
                      onBlur={() => commitField(option.id)}
                    />
                  </label>
                  <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
                    <span className="ua-cfg-pgw-field__label">Webhook secret (optional)</span>
                    <input
                      type="password"
                      className="ua-cfg-pgw-field__input"
                      value={entry.webhookSecret}
                      autoComplete="new-password"
                      disabled={busy}
                      placeholder="whsec_…"
                      onChange={(event) => updateGateway(option.id, { webhookSecret: event.target.value })}
                      onBlur={() => commitField(option.id)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
