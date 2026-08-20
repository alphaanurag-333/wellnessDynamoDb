import { useEffect, useRef, useState } from "react";
import {
  downloadCoachCheckoutInvoice,
  getCoachCheckoutOptions,
  listCoachCheckoutHistory,
  remindCoachCheckout,
  triggerCoachCheckout,
} from "../../api/appProgramApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import {
  discountLabel,
  discountedPrice,
  formatRupee,
  paymentSummary,
  programLabel,
} from "../../data/exchangeData.js";

function mapCatalog(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: String(row?.id || ""),
      name: String(row?.name || "").trim(),
      price: Number(row?.amount ?? row?.price) || 0,
      days: Number(row?.days) || 0,
    }))
    .filter((row) => row.id && row.name);
}

function mapDiscounts(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: `${row?.pct}-${row?.label}`,
      pct: Number(row?.pct),
      label: String(row?.label || "").trim(),
    }))
    .filter((row) => Number.isFinite(row.pct) && row.label);
}

function mapValidity(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((label) => {
      const value = String(label || "").trim();
      return value ? { id: value, label: value } : null;
    })
    .filter(Boolean);
}

function ConfirmModal({ open, title, body, confirming, onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !confirming) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, confirming]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={confirming ? undefined : onClose} role="presentation">
      <div className="ua-cp-ex-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="exchange-confirm-title">
        <p className="ua-cp-ex-modal__eyebrow">Confirm this action</p>
        <h3 id="exchange-confirm-title" className="ua-cp-ex-modal__title">{title}</h3>
        {body ? <p className="ua-cp-ex-modal__body">{body}</p> : null}
        <div className="ua-cp-ex-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose} disabled={confirming}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Triggering…" : "Yes, trigger it"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldSelect({ label, value, options, open, disabled, onToggle, onSelect, getLabel, bare = false }) {
  const ref = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onToggle(false);
    }
    if (open) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onToggle]);

  const select = (
    <div className="ua-cp-ex-select" ref={bare ? ref : undefined}>
      <button
        type="button"
        className={`ua-cp-ex-select__trigger${open ? " ua-cp-ex-select__trigger--open" : ""}`}
        onClick={() => !disabled && onToggle(!open)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="ua-cp-ex-select__value">{value}</span>
        {disabled ? null : <span className="ua-cp-ex-select__chev" aria-hidden="true">▾</span>}
      </button>
      {open ? (
        <ul className="ua-cp-ex-select__menu" role="listbox">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="ua-cp-ex-select__option"
                role="option"
                aria-selected={getLabel(option) === value}
                onClick={() => onSelect(option)}
              >
                {getLabel(option)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (bare) return select;

  return (
    <div className="ua-cp-ex-field" ref={ref}>
      {label ? <span className="ua-cp-ex-field__label">{label}</span> : null}
      {select}
    </div>
  );
}

function PaymentRow({ row, onToast }) {
  const awaiting = row.status === "awaiting";
  const [busy, setBusy] = useState(false);

  async function handleInvoice() {
    setBusy(true);
    try {
      await downloadCoachCheckoutInvoice(row.id);
      onToast?.("Invoice download started");
    } catch (error) {
      onToast?.(error.message || "Could not download invoice");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemind() {
    setBusy(true);
    try {
      const result = await remindCoachCheckout(row.id);
      onToast?.(result?.message || "Payment reminder sent");
    } catch (error) {
      onToast?.(error.message || "Could not send payment reminder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cp-ex-pay">
      <div className="ua-cp-ex-pay__main">
        <div className="ua-cp-ex-pay__title-row">
          <strong>{row.program}</strong>
          <span className={`ua-cp-ex-pay__badge ua-cp-ex-pay__badge--${row.status}`}>
            {awaiting ? "AWAITING PAYMENT" : "PAID"}
          </span>
        </div>
        <span className="ua-cp-ex-pay__detail">{row.date} · {row.detail}</span>
      </div>
      <div className="ua-cp-ex-pay__side">
        <div className="ua-cp-ex-pay__amounts">
          <strong>{formatRupee(row.amount)}</strong>
          {row.discountPct > 0 ? (
            <span>
              <s>{formatRupee(row.listed)}</s>
              {" · "}
              {row.discountPct}% off
            </span>
          ) : null}
        </div>
        {awaiting ? (
          <button
            type="button"
            className="ua-cp-btn ua-cp-ex-pay__btn ua-cp-ex-pay__btn--remind ua-cp-btn--sm"
            onClick={handleRemind}
            disabled={busy}
          >
            {busy ? "Sending…" : "Remind"}
          </button>
        ) : (
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-ex-pay__btn ua-cp-btn--sm" onClick={handleInvoice} disabled={busy}>
            {busy ? "Downloading…" : "📄 Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}

function subscriptionLabel(item) {
  if (!item) return "Off";
  return item.days > 0 ? `${item.name} · ${item.days} days` : item.name;
}

export function ExchangeSection({ user, onToast }) {
  const { canCreate, canToggle, canEdit } = useClientSectionPermissions("exchange");
  const [programs, setPrograms] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [validityPeriods, setValidityPeriods] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [program, setProgram] = useState(null);
  const [discount, setDiscount] = useState(null);
  const [validity, setValidity] = useState(null);
  const [includeSubscription, setIncludeSubscription] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [openField, setOpenField] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getCoachCheckoutOptions({
      validityPeriods: [],
      discountSlabs: [],
      appHealPeriods: [],
    })
      .then((options) => {
        if (!active) return;
        const nextPrograms = mapCatalog(options.programPricing);
        const nextDiscounts = mapDiscounts(options.programDiscountSlabs);
        const nextValidity = mapValidity(options.programValidityPeriods);
        const nextSubscriptions = mapCatalog(options.subscriptionPricing);
        setPrograms(nextPrograms);
        setDiscounts(nextDiscounts);
        setValidityPeriods(nextValidity);
        setSubscriptions(nextSubscriptions);
        setProgram(nextPrograms[0] || null);
        setDiscount(nextDiscounts[0] || null);
        setValidity(nextValidity[0] || null);
        setSubscription(nextSubscriptions[0] || null);
        setIncludeSubscription(nextSubscriptions.length > 0);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message || "Could not load App Program options");
        setPrograms([]);
        setDiscounts([]);
        setValidityPeriods([]);
        setSubscriptions([]);
        setProgram(null);
        setDiscount(null);
        setValidity(null);
        setSubscription(null);
        setIncludeSubscription(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setHistory([]);
      setHistoryError("");
      setHistoryLoading(false);
      return undefined;
    }

    setHistoryLoading(true);
    setHistoryError("");
    listCoachCheckoutHistory(user.id)
      .then((rows) => {
        if (!active) return;
        setHistory(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!active) return;
        setHistory([]);
        setHistoryError(error.message || "Could not load payment history");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const value = program && discount
    ? discountedPrice(program.price, discount.pct)
    : program
      ? program.price
      : 0;
  const summary = paymentSummary(history);
  const firstName = user?.name?.split(" ")[0] || "Client";
  const bundledOn = includeSubscription && Boolean(subscription);
  const canTrigger = canCreate && Boolean(user?.id && program && discount && validity && !loading && !triggering);

  function closeMenus() {
    setOpenField(null);
  }

  function toggleSubscription() {
    if (!canToggle || !subscriptions.length) return;
    const next = !includeSubscription;
    setIncludeSubscription(next);
    if (next && !subscription) setSubscription(subscriptions[0] || null);
    closeMenus();
  }

  async function handleTrigger() {
    if (!canTrigger) return;
    setTriggering(true);
    try {
      const result = await triggerCoachCheckout({
        userId: user.id,
        productType: "program",
        itemId: program.id,
        discountPercent: discount.pct,
        discountLabel: discount.label,
        linkValidity: validity.label,
        includeAppSubscription: bundledOn,
        subscriptionItemId: bundledOn ? subscription.id : null,
      });
      setConfirmOpen(false);
      onToast?.(result.message || `${program.name} triggered in app`);
      try {
        const rows = await listCoachCheckoutHistory(user.id);
        setHistory(Array.isArray(rows) ? rows : []);
        setHistoryError("");
      } catch (historyErr) {
        setHistoryError(historyErr.message || "Could not refresh payment history");
      }
    } catch (error) {
      onToast?.(error.message || "Could not trigger payment");
    } finally {
      setTriggering(false);
    }
  }

  const emptyConfig = !loading && !loadError && (!programs.length || !discounts.length || !validityPeriods.length);

  return (
    <div className="ua-cp-section ua-cp-ex">
      <div className="ua-cp-ex__head">
        <h2 className="ua-cp-ex__title">Energy Exchange</h2>
        <p className="ua-cp-ex__sub">Program payments for this client. Download any invoice, or trigger a fresh payment into their app.</p>
      </div>

      <div className="ua-cp-ex-panel">
        {canCreate ? (
          <>
        <div className="ua-cp-ex-panel__head">
          <strong>Trigger a payment</strong>
          <p>Pick a program and a discount slab — both come from what admin set in Energy Exchange; the value follows. App subscription, if enabled, is included in the same price.</p>
        </div>
        <div className="ua-cp-ex-form__grid">
          <FieldSelect
            label="Program"
            value={loading ? "Loading…" : program ? programLabel(program) : "No programs published"}
            options={programs}
            open={openField === "program"}
            disabled={loading || !programs.length || !canCreate}
            onToggle={(next) => setOpenField(next ? "program" : null)}
            onSelect={(next) => { setProgram(next); closeMenus(); }}
            getLabel={programLabel}
          />
          <FieldSelect
            label="Discount"
            value={loading ? "Loading…" : discount ? discountLabel(discount) : "No discount slabs published"}
            options={discounts}
            open={openField === "discount"}
            disabled={loading || !discounts.length}
            onToggle={(next) => setOpenField(next ? "discount" : null)}
            onSelect={(next) => { setDiscount(next); closeMenus(); }}
            getLabel={discountLabel}
          />
          <FieldSelect
            label="Link validity"
            value={loading ? "Loading…" : validity?.label || "No validity periods published"}
            options={validityPeriods}
            open={openField === "validity"}
            disabled={loading || !validityPeriods.length}
            onToggle={(next) => setOpenField(next ? "validity" : null)}
            onSelect={(next) => { setValidity(next); closeMenus(); }}
            getLabel={(option) => option.label}
          />
          <div className="ua-cp-ex-field">
            <span className="ua-cp-ex-field__label">Value</span>
            <div className="ua-cp-ex-field__value">{program && discount ? formatRupee(value) : "—"}</div>
          </div>
          <div className="ua-cp-ex-field">
            <span className="ua-cp-ex-field__label">App subscription</span>
            <div className={`ua-cp-ex-sub${bundledOn ? " ua-cp-ex-sub--on" : ""}`}>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${bundledOn ? " ua-toggle--on" : ""}`}
                aria-pressed={bundledOn}
                aria-label="Include app subscription"
                disabled={loading || !subscriptions.length || !canToggle}
                onClick={toggleSubscription}
              >
                <span className="ua-toggle__knob" />
              </button>
              {bundledOn ? (
                <FieldSelect
                  bare
                  label=""
                  value={subscriptionLabel(subscription)}
                  options={subscriptions}
                  open={openField === "subscription"}
                  disabled={loading || subscriptions.length < 2}
                  onToggle={(next) => setOpenField(next ? "subscription" : null)}
                  onSelect={(next) => { setSubscription(next); closeMenus(); }}
                  getLabel={subscriptionLabel}
                />
              ) : (
                <span className="ua-cp-ex-sub__off">
                  {loading ? "Loading…" : subscriptions.length ? "Off" : "None published"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="ua-cp-ex-form__actions">
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary ua-cp-ex-trigger"
            onClick={() => setConfirmOpen(true)}
            disabled={!canTrigger || emptyConfig}
          >
            🔔 Trigger to app
          </button>
          <p className="ua-cp-ex-form__note">
            {loadError
              ? loadError
              : emptyConfig
                ? "Publish Program, Discount, and Link validity on Configs → App Program before triggering a payment."
                : program && discount && validity
                  ? `Listed at ${formatRupee(program.price)} · ${discount.pct}% discount applied${bundledOn ? ` · ${subscriptionLabel(subscription)} included in the same price` : ""} · the payment link expires in ${validity.label.toLowerCase()} if unpaid; the invoice generates on success.`
                  : "Loading published App Program options…"}
          </p>
        </div>
          </>
        ) : (
          <p className="ua-cp-ex-form__note" role="note">
            You can view payment history below. Triggering new program payments requires Program assignment → create permission.
          </p>
        )}
      </div>

      <div className="ua-cp-ex-panel">
        <div className="ua-cp-ex-history__head">
          <div>
            <strong className="ua-cp-ex-history__title">Program payment history</strong>
            <p>Newest first. Invoices are available for settled payments.</p>
          </div>
          <span className="ua-cp-ex-history__summary">
            {historyLoading ? "Loading…" : historyError ? "—" : summary.label}
          </span>
        </div>
        <div className="ua-cp-ex-history__list">
          {historyLoading ? (
            <p className="ua-cp-ex-history__empty">Loading payment history…</p>
          ) : historyError ? (
            <p className="ua-cp-ex-history__empty">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="ua-cp-ex-history__empty">No program payments yet. Trigger a payment to send it to their app.</p>
          ) : (
            history.map((row) => (
              <PaymentRow key={row.id} row={row} onToast={onToast} />
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`Send this payment to ${firstName}'s app?`}
        body={program && discount
          ? `${program.name}${bundledOn ? ` + ${subscriptionLabel(subscription)}` : ""} · ${formatRupee(value)} after ${discount.pct}% discount${bundledOn ? ", with app subscription included in the same price" : ""}. They get a notification straight away and the invoice generates when they pay.`
          : null}
        confirming={triggering}
        onClose={() => !triggering && setConfirmOpen(false)}
        onConfirm={handleTrigger}
      />
    </div>
  );
}
