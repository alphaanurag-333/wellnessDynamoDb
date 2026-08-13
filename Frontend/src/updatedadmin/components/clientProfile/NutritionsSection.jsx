import { useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import {
  createDosageCard,
  createDraftOrder,
  DOSAGE_CARDS,
  formatSupplementOption,
  ORDER_HISTORY,
  SUPPLEMENT_POOL,
  TIMING_OPTIONS,
  UNIT_OPTIONS,
} from "../../data/userDetailData.js";

function BillUploadModal({ open, onClose, onAttach }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!open) setFileName("");
  }, [open]);

  if (!open) return null;

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (file) setFileName(file.name);
  }

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-nut-bill-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="bill-modal-title">
        <div className="ua-cp-nut-bill-modal__head">
          <div>
            <h3 id="bill-modal-title">Upload purchase bill</h3>
            <p>PDF or image only · up to 10 MB</p>
          </div>
          <button type="button" className="ua-cp-nut-bill-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <button type="button" className="ua-cp-nut-bill-modal__drop" onClick={() => inputRef.current?.click()}>
          <span className="ua-cp-nut-bill-modal__icon" aria-hidden="true">↑</span>
          <strong>{fileName || "Choose a file"}</strong>
          <span>Accepted: .pdf, .jpg, .png, .heic</span>
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" hidden onChange={handleFile} />
        <div className="ua-cp-nut-bill-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary"
            disabled={!fileName}
            onClick={() => {
              onAttach(fileName);
              onClose();
            }}
          >
            Attach bill
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderItemRow({ item, onQtyChange, onRemove }) {
  return (
    <div className="ua-cp-nut-order-item">
      <div>
        <strong>{item.name}</strong>
        <span>{item.pack} · Rs. {item.price.toLocaleString("en-IN")} each</span>
      </div>
      <div className="ua-cp-nut-order-item__qty">
        <button type="button" onClick={() => onQtyChange(Math.max(1, item.qty - 1))}>−</button>
        <span>{item.qty}</span>
        <button type="button" onClick={() => onQtyChange(item.qty + 1)}>+</button>
      </div>
      <strong className="ua-cp-nut-order-item__total">Rs. {(item.price * item.qty).toLocaleString("en-IN")}</strong>
      <button type="button" className="ua-cp-nut-order-item__remove" onClick={onRemove} aria-label="Remove item">×</button>
    </div>
  );
}

function CoachOrderCard({
  order,
  selected,
  onUpdate,
  onRemove,
  onSave,
  onOpenBill,
}) {
  const [itemPick, setItemPick] = useState("");
  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  function addItem() {
    const item = SUPPLEMENT_POOL.find((s) => s.id === itemPick);
    if (!item) return;
    onUpdate({
      ...order,
      items: (() => {
        const existing = order.items.find((x) => x.id === item.id);
        if (existing) {
          return order.items.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
        }
        return [...order.items, { ...item, qty: 1 }];
      })(),
    });
    setItemPick("");
  }

  function copyRecommendation() {
    onUpdate({
      ...order,
      items: selected.map((s) => ({ ...s })),
    });
  }

  return (
    <div className="ua-cp-nut-order-card">
      <div className="ua-cp-nut-order-card__head">
        <div className="ua-cp-nut-order-card__title-wrap">
          <span className="ua-cp-nut-order-card__num">#{order.number}</span>
          <div>
            <strong>{order.saved ? "Order logged" : "New order (not saved)"}</strong>
            <span>Add the vendor and the date you placed it</span>
          </div>
        </div>
        <div className="ua-cp-nut-order-card__actions">
          <span className="ua-cp-nut-order-card__badge">{order.saved ? "Saved" : "Draft"}</span>
          <button type="button" className="ua-cp-nut-order-card__close" onClick={onRemove} aria-label="Remove order">×</button>
        </div>
      </div>

      <div className="ua-cp-nut-order-card__items-head">
        <span>Items in this order</span>
        <strong>Rs. {total.toLocaleString("en-IN")}</strong>
      </div>

      {order.items.length ? (
        <div className="ua-cp-nut-order-card__items">
          {order.items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              onQtyChange={(qty) => onUpdate({
                ...order,
                items: order.items.map((x) => (x.id === item.id ? { ...x, qty } : x)),
              })}
              onRemove={() => onUpdate({
                ...order,
                items: order.items.filter((x) => x.id !== item.id),
              })}
            />
          ))}
        </div>
      ) : (
        <div className="ua-cp-nut-order-card__empty">
          No items yet — pick from the list below, or copy the client&apos;s recommendation.
        </div>
      )}

      <div className="ua-cp-nut-order-card__add-row">
        <select value={itemPick} onChange={(e) => setItemPick(e.target.value)}>
          <option value="">+ Add item…</option>
          {SUPPLEMENT_POOL.map((s) => (
            <option key={s.id} value={s.id}>{formatSupplementOption(s)}</option>
          ))}
        </select>
        <button type="button" className="ua-cp-nut-order-card__copy" disabled={!selected.length} onClick={copyRecommendation}>
          Copy recommendation
        </button>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={!itemPick} onClick={addItem}>Add</button>
      </div>

      <div className="ua-cp-nut-order-card__fields">
        <label className="ua-cp-nut-order-field">
          <span>Order placed on</span>
          <input type="date" value={order.placedOn} onChange={(e) => onUpdate({ ...order, placedOn: e.target.value })} />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Vendor / source</span>
          <input type="text" placeholder="e.g. Wellness Store, Amw" value={order.vendor} onChange={(e) => onUpdate({ ...order, vendor: e.target.value })} />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Tracking / AWB</span>
          <input type="text" placeholder="Optional" value={order.tracking} onChange={(e) => onUpdate({ ...order, tracking: e.target.value })} />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Expected delivery</span>
          <input type="date" value={order.expectedDelivery} onChange={(e) => onUpdate({ ...order, expectedDelivery: e.target.value })} />
        </label>
      </div>

      <div className="ua-cp-nut-order-card__bill">
        <div>
          <strong>{order.billName || "No purchase bill uploaded"}</strong>
          <span>Upload the vendor invoice or payment receipt (PDF or image)</span>
        </div>
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onOpenBill}>
          {order.billName ? "Replace bill" : "Upload bill"}
        </button>
      </div>

      <div className="ua-cp-nut-order-card__foot">
        <span>{order.saved ? "Saved to log" : "Not saved yet"}</span>
        <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onSave}>Save log</button>
      </div>
    </div>
  );
}

function CoachFulfilmentLog({
  orders,
  selected,
  onAddOrder,
  onUpdateOrder,
  onRemoveOrder,
  onSaveOrder,
  onAttachBill,
}) {
  const [billOrderId, setBillOrderId] = useState(null);
  const hasDraft = orders.some((o) => !o.saved);
  const statusLabel = orders.length === 0 ? "Not ordered yet" : hasDraft ? "Draft order" : "Orders logged";

  return (
    <div className="ua-cp-nut-log">
      <div className="ua-cp-nut-log__head">
        <strong>Coach fulfilment log</strong>
        <span className={`ua-cp-nut-log__status ua-cp-nut-log__status--${orders.length === 0 ? "pending" : hasDraft ? "draft" : "saved"}`}>
          {statusLabel}
        </span>
      </div>
      <p className="ua-cp-nut-log__hint">
        The client asked you to order it. Log each order you place — date, vendor and bill. Delivered orders move to the history below.
      </p>

      {orders.length === 0 ? (
        <div className="ua-cp-nut-log__empty">
          No order logged yet. Add one once you place it with the vendor.
        </div>
      ) : (
        orders.map((order) => (
          <CoachOrderCard
            key={order.id}
            order={order}
            selected={selected}
            onUpdate={onUpdateOrder}
            onRemove={() => onRemoveOrder(order.id)}
            onSave={() => onSaveOrder(order.id)}
            onOpenBill={() => setBillOrderId(order.id)}
          />
        ))
      )}

      <button type="button" className="ua-cp-nut-log__add" onClick={onAddOrder}>+ Add order</button>

      <BillUploadModal
        open={Boolean(billOrderId)}
        onClose={() => setBillOrderId(null)}
        onAttach={(fileName) => {
          if (!billOrderId) return;
          onAttachBill(billOrderId, fileName);
        }}
      />
    </div>
  );
}

function DosageCard({ card, onRemove }) {
  return (
    <div className="ua-cp-dosage-card">
      <div className="ua-cp-dosage-card__head">
        <strong>{card.name}</strong>
        <span>Daily dosage: <strong>{card.daily}</strong></span>
        <button type="button" className="ua-cp-dosage-card__close" onClick={onRemove} aria-label={`Remove ${card.name}`}>×</button>
      </div>
      <div className="ua-cp-dosage-meals">
        {card.meals.map((meal) => (
          <div key={meal.label} className="ua-cp-dosage-meal">
            <div className={`ua-cp-dosage-circle${meal.done ? " ua-cp-dosage-circle--done" : ""}`}>
              {meal.done ? "✓" : meal.count}
            </div>
            <div className="ua-cp-dosage-meal__label">{meal.label}</div>
            <div className="ua-cp-dosage-meal__amt">{meal.amount}</div>
          </div>
        ))}
      </div>
      <div className="ua-cp-dosage-card__foot">
        <span>{card.range}</span>
        <div className={`ua-cp-dosage-progress ua-cp-dosage-progress--${card.progressTone || "purple"}`}>
          <span style={{ width: `${card.pct}%` }} />
        </div>
        <span>{card.pct}% Completed</span>
      </div>
    </div>
  );
}

export function NutritionsSection({ onToast }) {
  const [sub, setSub] = useState("recommendation");
  const [selected, setSelected] = useState([
    { ...SUPPLEMENT_POOL.find((s) => s.id === "whey"), qty: 1 },
    { ...SUPPLEMENT_POOL.find((s) => s.id === "mag"), qty: 1 },
    { ...SUPPLEMENT_POOL.find((s) => s.id === "prob"), qty: 1 },
  ].filter(Boolean));
  const [fulfilment, setFulfilment] = useState("delivery");
  const [poolPick, setPoolPick] = useState("");
  const [coachOrders, setCoachOrders] = useState([]);
  const [dosages, setDosages] = useState(DOSAGE_CARDS);
  const [addSupp, setAddSupp] = useState(SUPPLEMENT_POOL[5]?.name || SUPPLEMENT_POOL[0].name);
  const [addTimings, setAddTimings] = useState([]);
  const [addQty, setAddQty] = useState(3);
  const [addUnit, setAddUnit] = useState("Tab");
  const [timingOpen, setTimingOpen] = useState(false);
  const timingRef = useRef(null);

  const billing = useMemo(() => selected.reduce((sum, s) => sum + s.price * s.qty, 0), [selected]);

  useEffect(() => {
    function onDocClick(event) {
      if (timingRef.current && !timingRef.current.contains(event.target)) {
        setTimingOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addFromPool() {
    const item = SUPPLEMENT_POOL.find((s) => s.id === poolPick);
    if (!item) return;
    setSelected((list) => {
      const existing = list.find((x) => x.id === item.id);
      if (existing) return list.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...list, { ...item, qty: 1 }];
    });
    setPoolPick("");
    onToast(`${item.name} added`);
  }

  function addCoachOrder() {
    setCoachOrders((list) => [...list, createDraftOrder(list.length + 1)]);
  }

  function updateCoachOrder(updated) {
    setCoachOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }

  function removeCoachOrder(id) {
    setCoachOrders((list) => list.filter((o) => o.id !== id).map((o, index) => ({ ...o, number: index + 1 })));
  }

  function saveCoachOrder(id) {
    setCoachOrders((list) => list.map((o) => (o.id === id ? { ...o, saved: true } : o)));
    onToast("Order log saved");
  }

  function attachBill(orderId, fileName) {
    setCoachOrders((list) => list.map((o) => (o.id === orderId ? { ...o, billName: fileName } : o)));
    onToast("Bill attached");
  }

  function addDosageCard() {
    if (!addTimings.length) return;
    const card = createDosageCard(addSupp, addTimings, addQty, addUnit);
    setDosages((list) => {
      const existing = list.findIndex((x) => x.name === addSupp);
      if (existing >= 0) {
        const next = [...list];
        next[existing] = card;
        return next;
      }
      return [...list, card];
    });
    onToast(`Added ${addSupp} ×${addTimings.length}`);
    setAddTimings([]);
    setTimingOpen(false);
  }

  return (
    <div className="ua-cp-section ua-cp-nutritions">
      <div className="ua-cp-nutritions__head">
        <h2 className="ua-cp-nutritions__title">Nutritions</h2>
        <p className="ua-cp-nutritions__sub">Supplement recommendation, pricing &amp; dosage plan.</p>
      </div>
      <PillTabs tabs={[{ id: "recommendation", label: "Recommendation" }, { id: "dosage", label: "Dosage" }]} active={sub} onChange={setSub} size="md" />

      {sub === "recommendation" ? (
        <>
          <div className="ua-cp-rec-block">
            <div className="ua-cp-rec-head">
              <span>Recommendations for the client</span>
              <span className="ua-cp-rec-head__count">{selected.length} selected</span>
            </div>
            <p className="ua-cp-rec-hint">Admin maintains the supplement pool; pick items from the dropdown and set quantities — the bill totals automatically.</p>
            <div className="ua-cp-rec-add">
              <select className="ua-cp-rec-select" value={poolPick} onChange={(e) => setPoolPick(e.target.value)}>
                <option value="">+ Add supplement from pool…</option>
                {SUPPLEMENT_POOL.map((s) => (
                  <option key={s.id} value={s.id}>{formatSupplementOption(s)}</option>
                ))}
              </select>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline" disabled={!poolPick} onClick={addFromPool}>Add</button>
            </div>
            {selected.map((s) => (
              <div key={s.id} className="ua-cp-rec-item">
                <div>
                  <div className="ua-cp-rec-item__name">{s.name}</div>
                  <div className="ua-cp-rec-item__pack">{s.pack} · Rs. {s.price.toLocaleString("en-IN")}</div>
                </div>
                <div className="ua-cp-rec-item__qty">
                  <button type="button" onClick={() => setSelected((list) => list.map((x) => (x.id === s.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>−</button>
                  <span>{s.qty}</span>
                  <button type="button" onClick={() => setSelected((list) => list.map((x) => (x.id === s.id ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                </div>
                <div className="ua-cp-rec-item__total">Rs. {(s.price * s.qty).toLocaleString("en-IN")}</div>
                <button type="button" className="ua-cp-rec-item__remove" onClick={() => setSelected((list) => list.filter((x) => x.id !== s.id))}>×</button>
              </div>
            ))}
            <div className="ua-cp-billing-bar">
              <span>Billing amount</span>
              <strong>Rs. {billing.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="ua-cp-fulfil">
            <div className="ua-cp-fulfil__label">Fulfilment option (shown in user app)</div>
            <div className="ua-cp-fulfil__options">
              <button type="button" className={`ua-cp-fulfil__opt${fulfilment === "delivery" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => setFulfilment("delivery")}>
                <strong>Send it to me</strong>
                <span>Request delivery from coach</span>
              </button>
              <button type="button" className={`ua-cp-fulfil__opt${fulfilment === "self" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => setFulfilment("self")}>
                <strong>Self billing</strong>
                <span>Client buys &amp; uploads bill (PDF)</span>
              </button>
            </div>

            {fulfilment === "delivery" ? (
              <CoachFulfilmentLog
                orders={coachOrders}
                selected={selected}
                onAddOrder={addCoachOrder}
                onUpdateOrder={updateCoachOrder}
                onRemoveOrder={removeCoachOrder}
                onSaveOrder={saveCoachOrder}
                onAttachBill={attachBill}
              />
            ) : null}

            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block" onClick={() => onToast("Saved & synced to user app")}>
              Save &amp; sync to user app
            </button>
          </div>

          <div className="ua-cp-order-history">
            <div className="ua-cp-order-history__label">Order history · Since joining</div>
            <div className="ua-cp-order-table">
              <div className="ua-cp-order-table__head"><div>Date</div><div>Items</div><div>Amount</div><div>Status</div></div>
              {ORDER_HISTORY.map((o) => (
                <div key={o.date + o.items} className="ua-cp-order-table__row">
                  <div>{o.date}</div>
                  <div><div>{o.items}</div><div className="ua-cp-order-table__sub">{o.type}</div></div>
                  <div>Rs. {o.amount.toLocaleString("en-IN")}</div>
                  <div><span className={`ua-cp-order-status ua-cp-order-status--${o.tone}`}>{o.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="ua-cp-dosage-hint">Pick a supplement, choose every timing it should be taken at, set the amount and unit, then add it to the client&apos;s dosage schedule.</p>
          <div className="ua-cp-dosage-add">
            <select value={addSupp} onChange={(e) => setAddSupp(e.target.value)}>
              {SUPPLEMENT_POOL.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
            <div className="ua-cp-timing-wrap" ref={timingRef}>
              <button type="button" className="ua-cp-timing-btn" onClick={() => setTimingOpen((o) => !o)}>
                {addTimings.length ? `${addTimings.length} timings selected` : "Choose timings…"}
              </button>
              {timingOpen ? (
                <div className="ua-cp-timing-menu">
                  <div className="ua-cp-timing-menu__tools">
                    <button type="button" onClick={() => setAddTimings([...TIMING_OPTIONS])}>Select all</button>
                    <button type="button" onClick={() => setAddTimings([])}>Clear</button>
                  </div>
                  {TIMING_OPTIONS.map((t) => (
                    <label key={t} className="ua-cp-timing-opt">
                      <input
                        type="checkbox"
                        checked={addTimings.includes(t)}
                        onChange={(e) => setAddTimings((list) => (e.target.checked ? [...list, t] : list.filter((x) => x !== t)))}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Number(e.target.value) || 1)} className="ua-cp-dosage-qty" />
            <select value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
              {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
            <button type="button" className="ua-cp-btn ua-cp-btn--primary" disabled={!addTimings.length} onClick={addDosageCard}>
              Add{addTimings.length ? ` ×${addTimings.length}` : ""}
            </button>
          </div>

          {dosages.map((card) => (
            <DosageCard
              key={card.id}
              card={card}
              onRemove={() => setDosages((list) => list.filter((x) => x.id !== card.id))}
            />
          ))}
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block" onClick={() => onToast("Dosage saved & synced")}>
            Save &amp; sync to user app
          </button>
        </>
      )}
    </div>
  );
}
