import { useEffect, useRef, useState } from "react";
import {
  EXCHANGE_DISCOUNTS,
  EXCHANGE_PROGRAMS,
  EXCHANGE_VALIDITY,
  PAYMENT_HISTORY,
  discountLabel,
  discountedPrice,
  formatRupee,
  paymentSummary,
  programLabel,
} from "../../data/exchangeData.js";

function ConfirmModal({ open, title, body, onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-ex-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="exchange-confirm-title">
        <p className="ua-cp-ex-modal__eyebrow">Confirm this action</p>
        <h3 id="exchange-confirm-title" className="ua-cp-ex-modal__title">{title}</h3>
        {body ? <p className="ua-cp-ex-modal__body">{body}</p> : null}
        <div className="ua-cp-ex-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onConfirm}>Yes, trigger it</button>
        </div>
      </div>
    </div>
  );
}

function FieldSelect({ label, value, options, open, onToggle, onSelect, getLabel }) {
  const ref = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onToggle(false);
    }
    if (open) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onToggle]);

  return (
    <div className="ua-cp-ex-field" ref={ref}>
      <span className="ua-cp-ex-field__label">{label}</span>
      <div className="ua-cp-ex-select">
        <button
          type="button"
          className={`ua-cp-ex-select__trigger${open ? " ua-cp-ex-select__trigger--open" : ""}`}
          onClick={() => onToggle(!open)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="ua-cp-ex-select__value">{value}</span>
          <span className="ua-cp-ex-select__chev" aria-hidden="true">▾</span>
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
    </div>
  );
}

function PaymentRow({ row, onToast }) {
  const awaiting = row.status === "awaiting";

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
          <span>{formatRupee(row.listed)} · {row.discountPct}% off</span>
        </div>
        {awaiting ? (
          <button type="button" className="ua-cp-btn ua-cp-ex-pay__btn ua-cp-ex-pay__btn--remind ua-cp-btn--sm" onClick={() => onToast?.("Payment reminder sent")}>
            Remind
          </button>
        ) : (
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-ex-pay__btn ua-cp-btn--sm" onClick={() => onToast?.("Invoice download started")}>
            📄 Invoice
          </button>
        )}
      </div>
    </div>
  );
}

export function ExchangeSection({ user, onToast }) {
  const [program, setProgram] = useState(EXCHANGE_PROGRAMS[0]);
  const [discount, setDiscount] = useState(EXCHANGE_DISCOUNTS[2]);
  const [validity, setValidity] = useState(EXCHANGE_VALIDITY[1]);
  const [openField, setOpenField] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = discountedPrice(program.price, discount.pct);
  const summary = paymentSummary(PAYMENT_HISTORY);
  const firstName = user?.name?.split(" ")[0] || "Client";

  function closeMenus() {
    setOpenField(null);
  }

  return (
    <div className="ua-cp-section ua-cp-ex">
      <div className="ua-cp-ex__head">
        <h2 className="ua-cp-ex__title">Energy Exchange</h2>
        <p className="ua-cp-ex__sub">Program payments for this client. Download any invoice, or trigger a fresh payment into their app.</p>
      </div>

      <div className="ua-cp-ex-panel">
        <div className="ua-cp-ex-panel__head">
          <strong>Trigger a payment</strong>
          <p>Pick a program and a discount slab — both come from what admin set in Energy Exchange; the value follows.</p>
        </div>
        <div className="ua-cp-ex-form__grid">
          <FieldSelect
            label="Program"
            value={programLabel(program)}
            options={EXCHANGE_PROGRAMS}
            open={openField === "program"}
            onToggle={(next) => setOpenField(next ? "program" : null)}
            onSelect={(next) => { setProgram(next); closeMenus(); }}
            getLabel={programLabel}
          />
          <FieldSelect
            label="Discount"
            value={discountLabel(discount)}
            options={EXCHANGE_DISCOUNTS}
            open={openField === "discount"}
            onToggle={(next) => setOpenField(next ? "discount" : null)}
            onSelect={(next) => { setDiscount(next); closeMenus(); }}
            getLabel={discountLabel}
          />
          <FieldSelect
            label="Link validity"
            value={validity.label}
            options={EXCHANGE_VALIDITY}
            open={openField === "validity"}
            onToggle={(next) => setOpenField(next ? "validity" : null)}
            onSelect={(next) => { setValidity(next); closeMenus(); }}
            getLabel={(option) => option.label}
          />
          <div className="ua-cp-ex-field">
            <span className="ua-cp-ex-field__label">Value</span>
            <div className="ua-cp-ex-field__value">{formatRupee(value)}</div>
          </div>
        </div>
        <div className="ua-cp-ex-form__actions">
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-ex-trigger" onClick={() => setConfirmOpen(true)}>
            🔔 Trigger to app
          </button>
          <p className="ua-cp-ex-form__note">
            Listed at {formatRupee(program.price)} · {discount.pct}% discount applied · the payment link expires in {validity.label.toLowerCase()} if unpaid; the invoice generates on success.
          </p>
        </div>
      </div>

      <div className="ua-cp-ex-panel">
        <div className="ua-cp-ex-history__head">
          <div>
            <strong className="ua-cp-ex-history__title">Program payment history</strong>
            <p>Newest first. Invoices are available for settled payments.</p>
          </div>
          <span className="ua-cp-ex-history__summary">{summary.label}</span>
        </div>
        <div className="ua-cp-ex-history__list">
          {PAYMENT_HISTORY.map((row) => (
            <PaymentRow key={row.id} row={row} onToast={onToast} />
          ))}
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`Send this payment to ${firstName}'s app?`}
        body={`${program.name} · ${formatRupee(value)} after ${discount.pct}% discount. They get a notification straight away and the invoice generates when they pay.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onToast?.("Payment triggered to app");
        }}
      />
    </div>
  );
}
