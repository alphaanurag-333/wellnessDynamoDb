import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import { formatLongDate } from "../../api/usersApi.js";
import {
  createUserSupplementDosage,
  createUserSupplementRecommendation,
  deleteUserSupplementFulfilmentOrder,
  listActiveSupplementPool,
  listUserSupplementDosages,
  listUserSupplementRecommendations,
  stopUserSupplementDosage,
  uploadUserSupplementFulfilmentOrderBill,
  upsertUserSupplementFulfilmentOrder,
} from "../../api/supplementAssignmentApi.js";
import { createDraftOrder, formatSupplementOption } from "../../data/userDetailData.js";

const PERIOD_OPTIONS = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

const PERIOD_LABEL = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function isHealClientUser(user) {
  const tier = String(user?.userTier || "").toLowerCase().trim();
  const label = String(user?.tier || "").toLowerCase().trim();
  return tier === "heal" || label === "seek to heal";
}

function isHealGateMessage(message) {
  return /heal \(paid\)/i.test(String(message || ""));
}

function todayIsoDate() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function packPriceLabel(item, { each = false } = {}) {
  const parts = [];
  if (item?.pack) parts.push(item.pack);
  if (Number(item?.price) > 0) {
    const price = `Rs. ${Number(item.price).toLocaleString("en-IN")}`;
    parts.push(each ? `${price} each` : price);
  }
  return parts.join(" · ");
}

function formatDateRange(startDate, endDate) {
  const fmt = (iso) => {
    const raw = String(iso || "").trim();
    if (!raw) return "";
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  const start = fmt(startDate);
  const end = fmt(endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

function sameItems(a = [], b = []) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => String(x.id).localeCompare(String(y.id)));
  const right = [...b].sort((x, y) => String(x.id).localeCompare(String(y.id)));
  return left.every((item, index) => (
    String(item.id) === String(right[index].id) && Number(item.qty) === Number(right[index].qty)
  ));
}

function mapApiOrderToUi(order, index) {
  return {
    id: order.id,
    number: index + 1,
    items: (order.items || []).map((item) => ({ ...item })),
    placedOn: order.placedOn || "",
    vendor: order.vendor || "",
    tracking: order.tracking || "",
    expectedDelivery: order.expectedDelivery || "",
    billName: order.billName || "",
    billPdfUrl: order.billPdfUrl || "",
    saved: true,
  };
}

function recommendationToHistoryRow(rec) {
  const items = (rec.items || []).map((item) => `${item.name} × ${item.qty}`).join(" · ");
  const selfBilling = rec.deliveryOption === "self_billing";
  let status = "Recommended";
  let tone = "green";
  if (selfBilling && rec.billUploadedAt) {
    status = "Bill uploaded";
    tone = "purple";
  } else if (selfBilling) {
    status = "Awaiting bill";
    tone = "purple";
  } else if (rec.deliveryRequestedAt) {
    status = "Delivery requested";
    tone = "purple";
  }
  return {
    id: rec.id,
    date: formatLongDate(rec.createdAt) || "—",
    items: items || "Supplements",
    type: selfBilling ? "Self billing" : "Coach delivery",
    amount: rec.billingTotal || 0,
    status,
    tone,
  };
}

function mapDosageToCard(dosage) {
  const pct = Number(dosage.progressPercent) || 0;
  return {
    id: dosage.id,
    name: dosage.name,
    daily: `${dosage.totalPerDay} ${dosage.unit}`.trim(),
    range: formatDateRange(dosage.startDate, dosage.endDate),
    pct,
    progressTone: pct >= 60 ? "green" : pct >= 25 ? "orange" : "purple",
    status: dosage.status,
    meals: (dosage.periods || []).map((period) => ({
      label: `${PERIOD_LABEL[period.period] || period.period} · ${period.mealRelation === "before" ? "before meal" : "after meal"}`,
      amount: `${period.quantity} ${dosage.unit}`.trim(),
      done: Boolean(period.completed),
      count: period.quantity,
    })),
  };
}

function FulfilmentStatus({ recommendation }) {
  if (!recommendation) {
    return (
      <div className="ua-cp-nut-log">
        <div className="ua-cp-nut-log__head">
          <strong>Fulfilment status</strong>
          <span className="ua-cp-nut-log__status ua-cp-nut-log__status--pending">Not saved yet</span>
        </div>
        <p className="ua-cp-nut-log__hint">
          Save this recommendation to sync the fulfilment option to the client app.
        </p>
      </div>
    );
  }

  const requestedOn = formatLongDate(recommendation.deliveryRequestedAt);
  const billedOn = formatLongDate(recommendation.billUploadedAt);
  const statusLabel = billedOn ? "Bill uploaded" : "Awaiting bill";
  const statusTone = billedOn ? "saved" : "pending";

  return (
    <div className="ua-cp-nut-log">
      <div className="ua-cp-nut-log__head">
        <strong>Fulfilment status</strong>
        <span className={`ua-cp-nut-log__status ua-cp-nut-log__status--${statusTone}`}>{statusLabel}</span>
      </div>
      <p className="ua-cp-nut-log__hint">
        {billedOn
          ? `Client uploaded a purchase bill on ${billedOn}.`
          : "The client will buy these supplements and upload a PDF bill in the app."}
      </p>
      {recommendation.billPdfUrl ? (
        <a className="ua-cp-nut-log__add" href={recommendation.billPdfUrl} target="_blank" rel="noreferrer">
          Open uploaded bill
        </a>
      ) : null}
      {requestedOn ? (
        <p className="ua-cp-nut-log__hint">Delivery was previously requested on {requestedOn}.</p>
      ) : null}
    </div>
  );
}

function BillUploadModal({ open, onClose, onAttach }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!open) setFile(null);
  }, [open]);

  if (!open) return null;

  function handleFile(event) {
    const next = event.target.files?.[0] || null;
    setFile(next);
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
          <strong>{file?.name || "Choose a file"}</strong>
          <span>Accepted: .pdf, .jpg, .png, .heic</span>
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" hidden onChange={handleFile} />
        <div className="ua-cp-nut-bill-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary"
            disabled={!file}
            onClick={() => {
              onAttach(file);
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

function OrderItemRow({ item, disabled, onQtyChange, onRemove }) {
  return (
    <div className="ua-cp-nut-order-item">
      <div>
        <strong>{item.name}</strong>
        <span>{packPriceLabel(item, { each: true }) || "—"}</span>
      </div>
      <div className="ua-cp-nut-order-item__qty">
        <button type="button" disabled={disabled} onClick={() => onQtyChange(Math.max(1, item.qty - 1))}>−</button>
        <span>{item.qty}</span>
        <button type="button" disabled={disabled} onClick={() => onQtyChange(item.qty + 1)}>+</button>
      </div>
      <strong className="ua-cp-nut-order-item__total">Rs. {((Number(item.price) || 0) * item.qty).toLocaleString("en-IN")}</strong>
      <button type="button" className="ua-cp-nut-order-item__remove" disabled={disabled} onClick={onRemove} aria-label="Remove item">×</button>
    </div>
  );
}

function CoachOrderCard({
  order,
  pool,
  selected,
  disabled,
  onUpdate,
  onRemove,
  onSave,
  onOpenBill,
}) {
  const [itemPick, setItemPick] = useState("");
  const total = order.items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);
  const availableItems = useMemo(
    () => (pool || []).filter((item) => !order.items.some((row) => row.id === item.id)),
    [order.items, pool],
  );

  function addItem() {
    const item = (pool || []).find((s) => s.id === itemPick);
    if (!item) return;
    onUpdate({
      ...order,
      saved: false,
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
      saved: false,
      items: selected.map((s) => ({ ...s })),
    });
  }

  function patch(fields) {
    onUpdate({ ...order, saved: false, ...fields });
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
          {!disabled ? (
            <button type="button" className="ua-cp-nut-order-card__close" onClick={onRemove} aria-label="Remove order">×</button>
          ) : null}
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
              disabled={disabled}
              onQtyChange={(qty) => patch({
                items: order.items.map((x) => (x.id === item.id ? { ...x, qty } : x)),
              })}
              onRemove={() => patch({
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
        <select
          value={itemPick}
          disabled={disabled || !availableItems.length}
          onChange={(e) => setItemPick(e.target.value)}
        >
          <option value="">
            {availableItems.length ? "+ Add item…" : order.items.length ? "All pool items added" : "+ Add item…"}
          </option>
          {availableItems.map((s) => (
            <option key={s.id} value={s.id}>{formatSupplementOption(s)}</option>
          ))}
        </select>
        <button
          type="button"
          className="ua-cp-nut-order-card__copy"
          disabled={disabled || !selected.length}
          onClick={copyRecommendation}
        >
          Copy recommendation
        </button>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
          disabled={disabled || !itemPick}
          onClick={addItem}
        >
          Add
        </button>
      </div>

      <div className="ua-cp-nut-order-card__fields">
        <label className="ua-cp-nut-order-field">
          <span>Order placed on</span>
          <input
            type="date"
            data-allow-future="true"
            value={order.placedOn}
            disabled={disabled}
            onChange={(e) => patch({ placedOn: e.target.value })}
          />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Vendor / source</span>
          <input
            type="text"
            placeholder="e.g. Wellness Store, Amw"
            value={order.vendor}
            disabled={disabled}
            onChange={(e) => patch({ vendor: e.target.value })}
          />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Tracking / AWB</span>
          <input
            type="text"
            placeholder="Optional"
            value={order.tracking}
            disabled={disabled}
            onChange={(e) => patch({ tracking: e.target.value })}
          />
        </label>
        <label className="ua-cp-nut-order-field">
          <span>Expected delivery</span>
          <input
            type="date"
            data-allow-future="true"
            value={order.expectedDelivery}
            disabled={disabled}
            onChange={(e) => patch({ expectedDelivery: e.target.value })}
          />
        </label>
      </div>

      <div className="ua-cp-nut-order-card__bill">
        <div>
          <strong>{order.billName || "No purchase bill uploaded"}</strong>
          <span>Upload the vendor invoice or payment receipt (PDF or image)</span>
          {order.billPdfUrl ? (
            <a href={order.billPdfUrl} target="_blank" rel="noreferrer">Open uploaded bill</a>
          ) : null}
        </div>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
          disabled={disabled}
          onClick={onOpenBill}
        >
          {order.billName ? "Replace bill" : "Upload bill"}
        </button>
      </div>

      <div className="ua-cp-nut-order-card__foot">
        <span>{order.saved ? "Saved to log" : "Not saved yet"}</span>
        {!disabled ? (
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={onSave}>
            Save log
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CoachFulfilmentLog({
  orders,
  pool,
  selected,
  disabled,
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
            pool={pool}
            selected={selected}
            disabled={disabled}
            onUpdate={onUpdateOrder}
            onRemove={() => onRemoveOrder(order.id)}
            onSave={() => onSaveOrder(order.id)}
            onOpenBill={() => setBillOrderId(order.id)}
          />
        ))
      )}

      {!disabled ? (
        <button type="button" className="ua-cp-nut-log__add" onClick={onAddOrder}>+ Add order</button>
      ) : null}

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

function DosageCard({ card, canRemove, onRemove }) {
  return (
    <div className={`ua-cp-dosage-card${card.status === "stopped" ? " ua-cp-dosage-card--stopped" : ""}`}>
      <div className="ua-cp-dosage-card__head">
        <strong>{card.name}</strong>
        <span>Daily dosage: <strong>{card.daily}</strong></span>
        {canRemove && card.status !== "stopped" ? (
          <button type="button" className="ua-cp-dosage-card__close" onClick={onRemove} aria-label={`Stop ${card.name}`}>×</button>
        ) : null}
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
        <span>{card.status === "stopped" ? "Stopped" : card.range}</span>
        <div className={`ua-cp-dosage-progress ua-cp-dosage-progress--${card.progressTone || "purple"}`}>
          <span style={{ width: `${card.pct}%` }} />
        </div>
        <span>{card.pct}% Completed</span>
      </div>
    </div>
  );
}

export function NutritionsSection({ user, onToast }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = isHealClientUser(user);
  const { can } = useViewAs();
  const canWrite = can("console.diet.create");
  const canRemove = can("console.diet.delete");

  const [sub, setSub] = useState("recommendation");
  const [pool, setPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [fulfilment, setFulfilment] = useState("delivery");
  const [coachOrders, setCoachOrders] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [dosages, setDosages] = useState([]);
  const [addSupp, setAddSupp] = useState("");
  const [addPeriods, setAddPeriods] = useState([]);
  const [addQty, setAddQty] = useState(1);
  const [addMeal, setAddMeal] = useState("after");
  const [addStart, setAddStart] = useState(todayIsoDate);
  const [timingOpen, setTimingOpen] = useState(false);
  const timingRef = useRef(null);

  const billing = useMemo(() => selected.reduce((sum, s) => sum + (Number(s.price) || 0) * s.qty, 0), [selected]);
  const availablePool = useMemo(
    () => pool.filter((item) => !selected.some((row) => row.id === item.id)),
    [pool, selected],
  );
  const activeDosages = useMemo(
    () => dosages.filter((row) => row.status !== "stopped"),
    [dosages],
  );
  const dirty = useMemo(() => {
    const savedOption = recommended?.deliveryOption === "self_billing" ? "self" : "delivery";
    const itemsOrOptionChanged = !sameItems(selected, recommended?.items || []) || fulfilment !== savedOption;
    const hasUnsyncedOrders = fulfilment === "delivery" && coachOrders.some((order) => (
      !order.saved
      && order.items.length
      && String(order.placedOn || "").trim()
      && String(order.vendor || "").trim()
    ));
    return itemsOrOptionChanged || hasUnsyncedOrders;
  }, [coachOrders, fulfilment, recommended, selected]);

  const canSaveAndSync = Boolean(canWrite && isHealClient && selected.length && !saving);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    setError("");
    const errors = [];
    try {
      try {
        const catalog = await listActiveSupplementPool({ limit: 200 });
        const nextPool = catalog?.items || [];
        setPool(nextPool);
        setAddSupp((current) => current || nextPool[0]?.id || "");
      } catch (err) {
        setPool([]);
        errors.push(err?.message || "Failed to load nutrition bank");
      }

      const [recResult, dosageResult] = await Promise.allSettled([
        listUserSupplementRecommendations(userId),
        listUserSupplementDosages(userId),
      ]);

      if (recResult.status === "fulfilled") {
        const current = recResult.value?.recommended || null;
        setRecommended(current);
        setHistory(recResult.value?.history || []);
        setSelected((current?.items || []).map((item) => ({ ...item })));
        setFulfilment(current?.deliveryOption === "self_billing" ? "self" : "delivery");
        const savedOrders = (current?.deliveryOption === "coach_delivery"
          ? (current?.fulfilmentOrders || [])
          : []
        ).map(mapApiOrderToUi);
        setCoachOrders(
          savedOrders.length
            ? savedOrders
            : current?.deliveryOption === "self_billing"
              ? []
              : [createDraftOrder(1)]
        );
      } else {
        setRecommended(null);
        setHistory([]);
        setSelected([]);
        setCoachOrders([]);
        const message = recResult.reason?.message || "Failed to load recommendations";
        if (!isHealGateMessage(message)) errors.push(message);
      }

      if (dosageResult.status === "fulfilled") {
        setDosages(dosageResult.value?.dosages || []);
      } else {
        setDosages([]);
        const message = dosageResult.reason?.message || "Failed to load dosages";
        if (!isHealGateMessage(message)) errors.push(message);
      }

      if (errors.length) {
        setError(errors[0]);
        onToast?.(errors[0]);
      }
    } finally {
      setLoading(false);
      setPoolLoading(false);
    }
  }, [onToast, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onDocClick(event) {
      if (timingRef.current && !timingRef.current.contains(event.target)) {
        setTimingOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addFromPool(id) {
    const item = pool.find((s) => s.id === id);
    if (!item) return;
    setSelected((list) => {
      const existing = list.find((x) => x.id === item.id);
      if (existing) return list.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...list, { ...item, qty: 1 }];
    });
    onToast(`${item.name} added`);
  }

  function addCoachOrder() {
    setCoachOrders((list) => [...list, createDraftOrder(list.length + 1)]);
  }

  function updateCoachOrder(updated) {
    setCoachOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }

  async function removeCoachOrder(id) {
    const order = coachOrders.find((o) => o.id === id);
    if (!order) return;

    if (order.saved && recommended?.id && !String(order.id).startsWith("order-")) {
      setSaving(true);
      try {
        const nextRec = await deleteUserSupplementFulfilmentOrder(userId, recommended.id, order.id);
        setRecommended(nextRec || recommended);
        setCoachOrders((list) => list.filter((o) => o.id !== id).map((o, index) => ({ ...o, number: index + 1 })));
        onToast("Order removed");
      } catch (err) {
        onToast?.(err?.message || "Could not remove order");
      } finally {
        setSaving(false);
      }
      return;
    }

    setCoachOrders((list) => list.filter((o) => o.id !== id).map((o, index) => ({ ...o, number: index + 1 })));
  }

  async function saveCoachOrder(id) {
    const order = coachOrders.find((o) => o.id === id);
    if (!order) return;
    if (!order.items.length) {
      onToast?.("Add at least one item to this order");
      return;
    }
    if (!String(order.placedOn || "").trim() || !String(order.vendor || "").trim()) {
      onToast?.("Enter order date and vendor before saving");
      return;
    }
    if (!recommended?.id || recommended.deliveryOption !== "coach_delivery") {
      onToast?.("Save & sync the coach-delivery recommendation first");
      return;
    }

    setSaving(true);
    try {
      const isLocalDraft = String(order.id).startsWith("order-");
      const result = await upsertUserSupplementFulfilmentOrder(userId, recommended.id, {
        ...order,
        id: isLocalDraft ? undefined : order.id,
      });
      if (result?.recommendation) setRecommended(result.recommendation);
      if (result?.order) {
        setCoachOrders((list) => list.map((o, index) => (
          o.id === id
            ? mapApiOrderToUi(result.order, index)
            : { ...o, number: index + 1 }
        )));
      }
      onToast("Order log saved & synced to user app");
    } catch (err) {
      onToast?.(err?.message || "Could not save order log");
    } finally {
      setSaving(false);
    }
  }

  async function attachBill(orderId, file) {
    if (!file) return;
    const order = coachOrders.find((o) => o.id === orderId);
    if (!order) return;
    if (!recommended?.id || recommended.deliveryOption !== "coach_delivery") {
      onToast?.("Save & sync the coach-delivery recommendation first");
      return;
    }

    setSaving(true);
    try {
      let serverOrderId = order.saved && !String(order.id).startsWith("order-") ? order.id : "";
      if (!serverOrderId) {
        if (!order.items.length || !order.placedOn || !order.vendor) {
          onToast?.("Fill items, date and vendor, then save the order before uploading a bill");
          return;
        }
        const saved = await upsertUserSupplementFulfilmentOrder(userId, recommended.id, {
          ...order,
          id: undefined,
        });
        if (saved?.recommendation) setRecommended(saved.recommendation);
        serverOrderId = saved?.order?.id || "";
        if (saved?.order) {
          setCoachOrders((list) => list.map((o, index) => (
            o.id === orderId ? mapApiOrderToUi(saved.order, index) : { ...o, number: index + 1 }
          )));
        }
      }
      if (!serverOrderId) {
        onToast?.("Could not prepare order for bill upload");
        return;
      }

      const result = await uploadUserSupplementFulfilmentOrderBill(
        userId,
        recommended.id,
        serverOrderId,
        file,
      );
      if (result?.recommendation) setRecommended(result.recommendation);
      if (result?.order) {
        setCoachOrders((list) => list.map((o, index) => (
          String(o.id) === String(serverOrderId) || o.id === orderId
            ? mapApiOrderToUi(result.order, index)
            : { ...o, number: index + 1 }
        )));
      }
      onToast("Bill uploaded & synced to user app");
    } catch (err) {
      onToast?.(err?.message || "Could not upload bill");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecommendation() {
    if (!selected.length) {
      onToast?.("Pick at least one supplement");
      return;
    }
    setSaving(true);
    try {
      // Always create a fresh recommendation so the user app receives a sync/push.
      const nextRecommendation = await createUserSupplementRecommendation(userId, {
        items: selected,
        deliveryOption: fulfilment,
      });
      let recommendationId = nextRecommendation?.id || "";
      if (nextRecommendation) setRecommended(nextRecommendation);

      let syncedOrders = 0;
      if (fulfilment === "delivery" && recommendationId) {
        const readyOrders = coachOrders.filter((order) => (
          order.items.length
          && String(order.placedOn || "").trim()
          && String(order.vendor || "").trim()
        ));

        for (const order of readyOrders) {
          const result = await upsertUserSupplementFulfilmentOrder(userId, recommendationId, {
            ...order,
            id: undefined,
          });
          if (result?.recommendation) {
            setRecommended(result.recommendation);
            recommendationId = result.recommendation.id;
          }
          syncedOrders += 1;
        }

        const skipped = coachOrders.length - readyOrders.length;
        if (skipped > 0 && readyOrders.length === 0) {
          onToast?.("Recommendation synced. Add items, date and vendor on each order to sync fulfilment logs.");
        }
      }

      await load({ silent: true });

      if (syncedOrders > 0) {
        onToast(`Saved & synced to user app · ${syncedOrders} order${syncedOrders === 1 ? "" : "s"}. Check the client app.`);
      } else {
        onToast("Saved & synced to user app. Check supplements in the client app.");
      }
    } catch (err) {
      onToast?.(err?.message || "Could not save & sync");
    } finally {
      setSaving(false);
    }
  }

  async function addDosageCard() {
    if (!addSupp || !addPeriods.length) return;
    setSaving(true);
    try {
      const existing = activeDosages.find((row) => row.supplementId === addSupp);
      if (existing) {
        await stopUserSupplementDosage(userId, existing.id);
      }
      await createUserSupplementDosage(userId, {
        supplementId: addSupp,
        startDate: addStart || todayIsoDate(),
        periods: addPeriods.map((period) => ({
          period,
          quantity: addQty,
          mealRelation: addMeal,
        })),
      });
      const name = pool.find((item) => item.id === addSupp)?.name || "Supplement";
      onToast(`Added ${name} ×${addPeriods.length}`);
      setAddPeriods([]);
      setTimingOpen(false);
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not save dosage");
    } finally {
      setSaving(false);
    }
  }

  async function handleStopDosage(dosageId) {
    if (!dosageId) return;
    setSaving(true);
    try {
      await stopUserSupplementDosage(userId, dosageId);
      onToast("Dosage stopped");
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not stop dosage");
    } finally {
      setSaving(false);
    }
  }

  const historyRows = useMemo(() => {
    const rows = [];
    const pushOrderRows = (rec) => {
      (rec?.fulfilmentOrders || []).forEach((order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const amount = order.billingTotal
          || orderItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);
        const items = orderItems.map((item) => `${item.name} × ${item.qty}`).join(" · ");
        rows.push({
          id: `${rec.id}-${order.id}`,
          date: formatLongDate(order.placedOn) || "—",
          items: items || "Supplements",
          type: order.vendor ? `Coach delivery · ${order.vendor}` : "Coach delivery",
          amount,
          status: order.billName || order.billPdfUrl ? "Bill uploaded" : "Order logged",
          tone: order.billName || order.billPdfUrl ? "purple" : "green",
        });
      });
    };

    if (recommended) {
      pushOrderRows(recommended);
      rows.push(recommendationToHistoryRow(recommended));
    }
    history.forEach((entry) => {
      pushOrderRows(entry);
      rows.push(recommendationToHistoryRow(entry));
    });
    return rows;
  }, [history, recommended]);

  if (!userId) {
    return <p className="ua-page-head__sub">Client is required to load nutritions.</p>;
  }

  return (
    <div className="ua-cp-section ua-cp-nutritions">
      <div className="ua-cp-nutritions__head">
        <h2 className="ua-cp-nutritions__title">Nutritions</h2>
        <p className="ua-cp-nutritions__sub">Supplement recommendation, pricing &amp; dosage plan.</p>
      </div>
      <PillTabs tabs={[{ id: "recommendation", label: "Recommendation" }, { id: "dosage", label: "Dosage" }]} active={sub} onChange={setSub} size="md" />

      {loading ? <p className="ua-page-head__sub">Loading nutritions…</p> : null}
      {error && !loading ? <p className="ua-page-head__sub" style={{ color: "#b42318" }}>{error}</p> : null}
      {!isHealClient && !loading ? (
        <p className="ua-page-head__sub">Supplements can only be assigned to Heal (paid) clients.</p>
      ) : null}

      {sub === "recommendation" ? (
        <>
          <div className="ua-cp-rec-block">
            <div className="ua-cp-rec-head">
              <span>Recommendations for the client</span>
              <span className="ua-cp-rec-head__count">{selected.length} selected</span>
            </div>
            <p className="ua-cp-rec-hint">Pick items from the nutrition bank and set quantities — the bill totals automatically. Saving syncs this plan to the client app.</p>
            <div className="ua-cp-rec-add">
              <select
                className="ua-cp-rec-select"
                value=""
                onChange={(e) => addFromPool(e.target.value)}
                disabled={!canWrite || !isHealClient || poolLoading || saving || !availablePool.length}
              >
                <option value="">
                  {poolLoading
                    ? "Loading supplement pool…"
                    : availablePool.length
                      ? "+ Add supplement from pool..."
                      : pool.length
                        ? "All supplements from the pool are selected"
                        : "Add supplements in Config → Nutrition bank first"}
                </option>
                {availablePool.map((s) => (
                  <option key={s.id} value={s.id}>{formatSupplementOption(s)}</option>
                ))}
              </select>
            </div>
            {selected.length ? (
              <div className="ua-cp-rec-items">
                {selected.map((s) => (
                  <div key={s.id} className="ua-cp-rec-item">
                    <div className="ua-cp-rec-item__info">
                      <div className="ua-cp-rec-item__name">{s.name}</div>
                      {packPriceLabel(s) ? <div className="ua-cp-rec-item__pack">{packPriceLabel(s)}</div> : null}
                    </div>
                    <div className="ua-cp-rec-item__meta">
                      <div className="ua-cp-rec-item__qty">
                        <button type="button" disabled={!canWrite || saving} onClick={() => setSelected((list) => list.map((x) => (x.id === s.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>−</button>
                        <span>{s.qty}</span>
                        <button type="button" disabled={!canWrite || saving} onClick={() => setSelected((list) => list.map((x) => (x.id === s.id ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                      </div>
                      <div className="ua-cp-rec-item__total">Rs. {((Number(s.price) || 0) * s.qty).toLocaleString("en-IN")}</div>
                      <button type="button" className="ua-cp-rec-item__remove" disabled={!canWrite || saving} onClick={() => setSelected((list) => list.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (!loading ? <p className="ua-cp-rec-hint">No supplements selected yet.</p> : null)}
            <div className="ua-cp-billing-bar">
              <span>Billing amount</span>
              <strong>Rs. {billing.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="ua-cp-fulfil">
            <div className="ua-cp-fulfil__label">Fulfilment option (shown in user app)</div>
            <div className="ua-cp-fulfil__options">
              <button type="button" disabled={!canWrite || saving || !isHealClient} className={`ua-cp-fulfil__opt${fulfilment === "delivery" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => {
                setFulfilment("delivery");
                setCoachOrders((list) => (list.length ? list : [createDraftOrder(1)]));
              }}>
                <strong>Send it to me</strong>
                <span>Request delivery from coach</span>
              </button>
              <button type="button" disabled={!canWrite || saving || !isHealClient} className={`ua-cp-fulfil__opt${fulfilment === "self" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => setFulfilment("self")}>
                <strong>Self billing</strong>
                <span>Client buys &amp; uploads bill (PDF)</span>
              </button>
            </div>

            {fulfilment === "delivery" ? (
              <CoachFulfilmentLog
                orders={coachOrders}
                pool={pool}
                selected={selected}
                disabled={!canWrite || saving || !isHealClient}
                onAddOrder={addCoachOrder}
                onUpdateOrder={updateCoachOrder}
                onRemoveOrder={removeCoachOrder}
                onSaveOrder={saveCoachOrder}
                onAttachBill={attachBill}
              />
            ) : (
              <FulfilmentStatus recommendation={recommended} />
            )}

            {canWrite && isHealClient ? (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block"
                disabled={!canSaveAndSync}
                onClick={saveRecommendation}
              >
                {saving ? "Saving…" : "Save & sync to user app"}
              </button>
            ) : null}
          </div>

          <div className="ua-cp-order-history">
            <div className="ua-cp-order-history__label">Order history · Since joining</div>
            <div className="ua-cp-order-table">
              <div className="ua-cp-order-table__head"><div>Date</div><div>Items</div><div>Amount</div><div>Status</div></div>
              {historyRows.length ? historyRows.map((o) => (
                <div key={o.id} className="ua-cp-order-table__row">
                  <div style={{fontWeight:'600',color:"rgb(90, 107, 133)"}}>{o.date}</div>
                  <div><div>{o.items}</div><div className="ua-cp-order-table__sub">{o.type}</div></div>
                  <div style={{fontWeight:'bold'}}>Rs. {o.amount.toLocaleString("en-IN")}</div>
                  <div><span className={`ua-cp-order-status ua-cp-order-status--${o.tone}`}>{o.status}</span></div>
                </div>
              )) : (
                <div className="ua-cp-order-table__row">
                  <div>—</div>
                  <div>No recommendations saved yet</div>
                  <div>—</div>
                  <div>—</div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="ua-cp-dosage-hint">Pick a supplement, choose morning / afternoon / evening, set the amount, then add it to the client&apos;s dosage schedule. Duration is calculated from pack size.</p>
          <div className="ua-cp-dosage-add">
            <select value={addSupp} onChange={(e) => setAddSupp(e.target.value)} disabled={!canWrite || poolLoading || !pool.length || saving || !isHealClient}>
              {pool.length ? pool.map((s) => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">No supplements in pool</option>}
            </select>
            <div className="ua-cp-timing-wrap" ref={timingRef}>
              <button
                type="button"
                className={`ua-cp-timing-btn${timingOpen ? " is-open" : ""}${addPeriods.length ? " has-value" : ""}`}
                disabled={!canWrite || saving || !isHealClient}
                onClick={() => setTimingOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={timingOpen}
              >
                <span className="ua-cp-timing-btn__label">
                  {addPeriods.length ? `${addPeriods.length} timings selected` : "Choose timings…"}
                </span>
                <span className="ua-cp-timing-btn__chevron" aria-hidden="true" />
              </button>
              {timingOpen ? (
                <div className="ua-cp-timing-menu" role="listbox">
                  <div className="ua-cp-timing-menu__tools">
                    <button type="button" onClick={() => setAddPeriods(PERIOD_OPTIONS.map((p) => p.id))}>Select all</button>
                    <button type="button" onClick={() => setAddPeriods([])}>Clear</button>
                  </div>
                  {PERIOD_OPTIONS.map((t) => (
                    <label key={t.id} className="ua-cp-timing-opt">
                      <input
                        type="checkbox"
                        checked={addPeriods.includes(t.id)}
                        onChange={(e) => setAddPeriods((list) => (e.target.checked ? [...list, t.id] : list.filter((x) => x !== t.id)))}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Math.max(1, Number(e.target.value) || 1))} className="ua-cp-dosage-qty" disabled={!canWrite || saving || !isHealClient} />
            <select value={addMeal} onChange={(e) => setAddMeal(e.target.value)} disabled={!canWrite || saving || !isHealClient}>
              <option value="after">After meal</option>
              <option value="before">Before meal</option>
            </select>
            <input type="date" data-allow-future="true" value={addStart} onChange={(e) => setAddStart(e.target.value)} className="ua-cp-dosage-date" disabled={!canWrite || saving || !isHealClient} />
            {canWrite && isHealClient ? (
              <button type="button" className="ua-cp-btn ua-cp-btn--primary" disabled={!addSupp || !addPeriods.length || saving} onClick={addDosageCard}>
                {saving ? "Saving…" : `Add${addPeriods.length ? ` ×${addPeriods.length}` : ""}`}
              </button>
            ) : null}
          </div>

          {!loading && !activeDosages.length ? (
            <p className="ua-cp-dosage-hint">No dosage schedule yet.</p>
          ) : null}

          {activeDosages.map((dosage) => (
            <DosageCard
              key={dosage.id}
              card={mapDosageToCard(dosage)}
              canRemove={canRemove}
              onRemove={() => handleStopDosage(dosage.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}
