import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import { formatLongDate } from "../../api/usersApi.js";
import {
  createUserSupplementDosageBatch,
  updateUserSupplementDosage,
  pushUserSupplementDosages,
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

const COMPOSITE_PERIOD_SEP = "__";
const MAX_DAY_PARTS = 3;
const MAX_TIMINGS = 4;
const MAX_PERIODS = 4;

const DAY_PART_OPTIONS = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

const FREQUENCY_OPTIONS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "every_15_days", label: "Every 15 days" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

const DOSAGE_UNIT_IDS = ["Cap", "Tab", "Mg", "Softgles", "Sachets", "Grms"];

const DOSAGE_UNIT_OPTIONS = DOSAGE_UNIT_IDS.map((id) => ({ id, label: id }));

function normalizeDraftUnit(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Cap";
  const match = DOSAGE_UNIT_IDS.find((id) => id.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  const lower = raw.toLowerCase();
  if (["grams", "gram", "gr", "g", "grms"].includes(lower)) return "Grms";
  if (lower === "no" || lower === "number" || lower === "nos") return "Cap";
  return "Cap";
}

function formatDosageAmount(quantity, unit) {
  const qty = Number(quantity) || 0;
  const label = String(unit || "").trim();
  if (label === "Gr" || label === "Ml") return `${qty}${label}`;
  return `${qty} ${label}`.trim();
}

const MEAL_TIMING_OPTIONS = [
  { id: "before_1st_meal", label: "Before 1st Meal" },
  { id: "before_2nd_meal", label: "Before 2nd Meal" },
  { id: "before_3rd_meal", label: "Before 3rd Meal" },
  { id: "before_4th_meal", label: "Before 4th Meal" },
  { id: "after_1st_meal", label: "After 1st Meal" },
  { id: "after_2nd_meal", label: "After 2nd Meal" },
  { id: "after_3rd_meal", label: "After 3rd Meal" },
  { id: "after_4th_meal", label: "After 4th Meal" },
  { id: "empty_stomach_morning", label: "Empty Stomach (Morning)" },
  { id: "empty_stomach_evening", label: "Empty Stomach (Evening)" },
  { id: "before_bed_30_mins", label: "30 mins Before Bed" },
  { id: "after_morning_snacks", label: "After Morning Snacks" },
  { id: "before_morning_snacks", label: "Before Morning Snacks" },
  { id: "after_evening_snacks", label: "After Evening Snacks" },
  { id: "before_evening_snacks", label: "Before Evening Snacks" },
];

const PERIOD_LABEL = Object.fromEntries(
  [...DAY_PART_OPTIONS, ...MEAL_TIMING_OPTIONS].map((row) => [row.id, row.label]),
);

function mealRelationForPeriod(periodId) {
  const id = String(periodId || "");
  const mealTiming = id.includes(COMPOSITE_PERIOD_SEP)
    ? id.slice(id.indexOf(COMPOSITE_PERIOD_SEP) + COMPOSITE_PERIOD_SEP.length)
    : id;
  if (
    mealTiming === "morning"
    || mealTiming === "afternoon"
    || mealTiming === "evening"
    || mealTiming === "night"
    || mealTiming.startsWith("before_")
    || mealTiming.startsWith("empty_stomach")
  ) {
    return "before";
  }
  return "after";
}

function composePeriod(dayPart, mealTiming) {
  return `${dayPart}${COMPOSITE_PERIOD_SEP}${mealTiming}`;
}

function parseCompositePeriod(period) {
  const raw = String(period || "");
  const sep = raw.indexOf(COMPOSITE_PERIOD_SEP);
  if (sep <= 0) return null;
  const dayPart = raw.slice(0, sep);
  const mealTiming = raw.slice(sep + COMPOSITE_PERIOD_SEP.length);
  if (!PERIOD_LABEL[dayPart] || !PERIOD_LABEL[mealTiming]) return null;
  return { dayPart, mealTiming };
}

function plannedPeriodCount(dayPartIds, mealTimingIds) {
  if (dayPartIds.length && mealTimingIds.length) {
    return dayPartIds.length * mealTimingIds.length;
  }
  return dayPartIds.length || mealTimingIds.length;
}

function buildDosagePeriods(dayPartIds, mealTimingIds, quantity) {
  if (dayPartIds.length && mealTimingIds.length) {
    return dayPartIds.flatMap((dayPart) => (
      mealTimingIds.map((mealTiming) => ({
        period: composePeriod(dayPart, mealTiming),
        quantity,
        mealRelation: mealRelationForPeriod(mealTiming),
      }))
    ));
  }
  if (dayPartIds.length) {
    return dayPartIds.map((period) => ({
      period,
      quantity,
      mealRelation: mealRelationForPeriod(period),
    }));
  }
  return mealTimingIds.map((period) => ({
    period,
    quantity,
    mealRelation: mealRelationForPeriod(period),
  }));
}

function toggleLimitedOption(list, id, checked, max) {
  if (!checked) return list.filter((x) => x !== id);
  if (list.includes(id)) return list;
  if (list.length >= max) return list;
  return [...list, id];
}

function dayPartButtonLabel(selected) {
  if (!selected.length) return "Morning / Afternoon / Evening…";
  if (selected.length === DAY_PART_OPTIONS.length) return "All day parts";
  return selected
    .map((id) => DAY_PART_OPTIONS.find((row) => row.id === id)?.label || id)
    .join(", ");
}

function formatPeriodCardLabel(period) {
  const composite = parseCompositePeriod(period.period);
  if (composite) {
    return `${PERIOD_LABEL[composite.dayPart]} · ${PERIOD_LABEL[composite.mealTiming]}`;
  }
  const label = PERIOD_LABEL[period.period] || period.period;
  if (["morning", "afternoon", "evening", "night"].includes(period.period)) {
    return `${label} · ${period.mealRelation === "before" ? "before meal" : "after meal"}`;
  }
  return label;
}

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

function newDraftRow() {
  return {
    key: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    supplementId: "",
    totalQuantity: 1,
    dailyQuantity: 1,
    dayParts: [],
    mealTimings: [],
    unit: "Cap",
    startDate: todayIsoDate(),
    frequency: "weekly",
    customIntervalDays: 15,
  };
}

function dosageToDraft(dosage) {
  const dayParts = [];
  const mealTimings = [];
  for (const period of dosage?.periods || []) {
    const raw = String(period.period || "");
    const composite = parseCompositePeriod(raw);
    if (composite) {
      if (!dayParts.includes(composite.dayPart)) dayParts.push(composite.dayPart);
      if (!mealTimings.includes(composite.mealTiming)) mealTimings.push(composite.mealTiming);
      continue;
    }
    if (DAY_PART_OPTIONS.some((option) => option.id === raw) && !dayParts.includes(raw)) {
      dayParts.push(raw);
    } else if (MEAL_TIMING_OPTIONS.some((option) => option.id === raw) && !mealTimings.includes(raw)) {
      mealTimings.push(raw);
    }
  }
  const unit = normalizeDraftUnit(dosage?.unit);
  const dailyQuantity = Math.max(
    1,
    Number(dosage?.dailyQuantity)
      || Number(dosage?.periods?.[0]?.quantity)
      || 1,
  );
  const totalQuantity = Math.max(
    dailyQuantity,
    Number(dosage?.totalQuantity) || dailyQuantity,
  );
  return {
    key: dosage.id,
    supplementId: dosage.supplementId || "",
    totalQuantity,
    dailyQuantity,
    dayParts,
    mealTimings,
    unit,
    startDate: dosage.startDate || todayIsoDate(),
    frequency: dosage.frequency || "weekly",
    customIntervalDays: dosage.frequency === "custom" ? (Number(dosage.intervalDays) || 15) : 15,
  };
}

function draftPayload(row) {
  const dailyQuantity = Math.max(1, Math.floor(Number(row.dailyQuantity) || 1));
  const totalQuantity = Math.max(1, Math.floor(Number(row.totalQuantity) || 1));
  const periods = buildDosagePeriods(row.dayParts || [], row.mealTimings || [], dailyQuantity);
  const beforeFirstMeal = periods.some((period) => (
    String(period.period || "").includes("before_1st_meal")
  ));
  return {
    supplementId: row.supplementId,
    totalQuantity,
    dailyQuantity,
    quantity: dailyQuantity,
    periods,
    beforeFirstMeal,
    unit: normalizeDraftUnit(row.unit),
    startDate: row.startDate,
    frequency: row.frequency,
    customIntervalDays: row.frequency === "custom" ? Math.floor(Number(row.customIntervalDays) || 0) : undefined,
  };
}

function isBlankDraft(row) {
  return !row.supplementId && !(row.dayParts || []).length && !(row.mealTimings || []).length;
}

function validateDraftRow(row, pool) {
  if (!row.supplementId) return "Choose a nutrition";
  if (!pool.some((item) => item.id === row.supplementId)) return "Choose a nutrition from the bank";
  const periodCount = plannedPeriodCount(row.dayParts || [], row.mealTimings || []);
  if (!periodCount) return "Select morning / afternoon / evening or meal timings";
  if (periodCount > MAX_PERIODS) return `Select at most ${MAX_PERIODS} timings per nutrition`;
  const dailyQuantity = Math.floor(Number(row.dailyQuantity) || 0);
  const totalQuantity = Math.floor(Number(row.totalQuantity) || 0);
  if (!(dailyQuantity > 0)) return "Daily qty must be greater than 0";
  if (!(totalQuantity > 0)) return "Total qty must be greater than 0";
  if (totalQuantity < dailyQuantity) return "Total qty must be greater than or equal to Daily qty";
  if (totalQuantity < dailyQuantity * periodCount) {
    return "Total qty must cover at least one full dose day";
  }
  if (!row.startDate) return "Start date is required";
  if (row.frequency === "custom") {
    const days = Math.floor(Number(row.customIntervalDays) || 0);
    if (days < 1 || days > 365) return "Custom interval must be between 1 and 365 days";
  }
  return "";
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
    items: items || "Nutritions",
    type: selfBilling ? "Self billing" : "Coach delivery",
    amount: rec.billingTotal || 0,
    status,
    tone,
  };
}

function mapDosageToCard(dosage) {
  const pct = Number(dosage.progressPercent) || 0;
  const scheduled = Number(dosage.intervalDays) > 0;
  const scheduleLabel = dosage.frequencyLabel || "";
  const range = scheduled
    ? `${formatDateRange(dosage.startDate, "")}${scheduleLabel ? ` · ${scheduleLabel}` : ""}`
    : formatDateRange(dosage.startDate, dosage.endDate);
  return {
    id: dosage.id,
    name: dosage.name,
    daily: formatDosageAmount(dosage.totalPerDay, dosage.unit),
    dailyQty: formatDosageAmount(dosage.dailyQuantity || dosage.periods?.[0]?.quantity || 0, dosage.unit),
    totalQty: dosage.totalQuantity
      ? formatDosageAmount(dosage.totalQuantity, dosage.unit)
      : "",
    range,
    pct,
    progressTone: pct >= 60 ? "green" : pct >= 25 ? "orange" : "purple",
    status: dosage.status,
    scheduled,
    publishedToApp: dosage.publishedToApp !== false,
    frequencyLabel: scheduleLabel,
    meals: (dosage.periods || []).map((period) => ({
      label: formatPeriodCardLabel(period),
      amount: formatDosageAmount(period.quantity, dosage.unit),
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
          : "The client will buy these nutritions and upload a PDF bill in the app."}
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

function DosageCard({ card, canRemove, canEdit, canSelect, onRemove, onEdit, checked, onCheck }) {
  const showCheck = canSelect && card.scheduled && card.publishedToApp === false && card.status !== "stopped";
  return (
    <div className={`ua-cp-dosage-card${card.status === "stopped" ? " ua-cp-dosage-card--stopped" : ""}`}>
      <div className="ua-cp-dosage-card__head">
        {showCheck ? (
          <label className="ua-cp-dosage-check">
            <input
              type="checkbox"
              checked={checked}
              aria-label={`Select ${card.name} to push to the app`}
              onChange={(e) => onCheck?.(e.target.checked)}
            />
          </label>
        ) : null}
        <strong>{card.name}</strong>
        {card.scheduled ? (
          <>
            {card.totalQty ? <span>Total qty: <strong>{card.totalQty}</strong></span> : null}
            <span>Daily qty: <strong>{card.dailyQty || card.daily}</strong></span>
          </>
        ) : (
          <span>Daily dosage: <strong>{card.daily}</strong></span>
        )}
        {card.scheduled ? (
          <span className={`ua-cp-dosage-badge${card.publishedToApp ? " ua-cp-dosage-badge--live" : ""}`}>
            {card.publishedToApp ? "In app" : "Draft"}
          </span>
        ) : (
          <span className="ua-cp-dosage-badge ua-cp-dosage-badge--live">In app</span>
        )}
        {canEdit && card.status !== "stopped" ? (
          <button type="button" className="ua-cp-dosage-card__edit" onClick={onEdit}>Edit</button>
        ) : null}
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

function DosageDraftEditor({
  row,
  pool,
  takenIds,
  disabled,
  onChange,
  onRemove,
}) {
  const dayPartRef = useRef(null);
  const timingRef = useRef(null);
  const [dayPartOpen, setDayPartOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const dayParts = row.dayParts || [];
  const mealTimings = row.mealTimings || [];
  const options = pool.filter((item) => item.id === row.supplementId || !takenIds.has(item.id));
  const periodCount = plannedPeriodCount(dayParts, mealTimings);
  const dailyQuantity = Number(row.dailyQuantity) || 0;
  const dayTotal = dailyQuantity * periodCount;
  const unitLabel = normalizeDraftUnit(row.unit);

  useEffect(() => {
    function onDocClick(event) {
      if (dayPartRef.current && !dayPartRef.current.contains(event.target)) {
        setDayPartOpen(false);
      }
      if (timingRef.current && !timingRef.current.contains(event.target)) {
        setTimingOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="ua-cp-dosage-row">
      <div className="ua-cp-dosage-row__grid">
        <label>
          <span>Nutrition</span>
          <select
            value={row.supplementId}
            disabled={disabled || !pool.length}
            onChange={(e) => onChange({ supplementId: e.target.value })}
          >
            <option value="">{options.length ? "Choose nutrition…" : "No nutritions left"}</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Total qty</span>
          <input
            type="number"
            min={1}
            value={row.totalQuantity}
            disabled={disabled}
            aria-label="Total quantity"
            onChange={(e) => onChange({ totalQuantity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label>
          <span>Unit</span>
          <select
            value={row.unit}
            disabled={disabled}
            aria-label="Dosage unit"
            onChange={(e) => onChange({ unit: e.target.value })}
          >
            {DOSAGE_UNIT_OPTIONS.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Daily qty</span>
          <input
            type="number"
            min={1}
            value={row.dailyQuantity}
            disabled={disabled}
            aria-label="Daily quantity"
            onChange={(e) => {
              const dailyQuantity = Math.max(1, Number(e.target.value) || 1);
              onChange({
                dailyQuantity,
                totalQuantity: Math.max(dailyQuantity, Number(row.totalQuantity) || dailyQuantity),
              });
            }}
          />
        </label>
        <label>
          <span>Start date</span>
          <input
            type="date"
            data-allow-future="true"
            value={row.startDate}
            disabled={disabled}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </label>
        <label>
          <span>How often</span>
          <select
            value={row.frequency}
            disabled={disabled}
            aria-label="How often"
            onChange={(e) => onChange({ frequency: e.target.value })}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        {row.frequency === "custom" ? (
          <label>
            <span>Every (days)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={row.customIntervalDays}
              disabled={disabled}
              aria-label="Custom interval in days"
              onChange={(e) => onChange({
                customIntervalDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
              })}
            />
          </label>
        ) : null}
      </div>

      <div className="ua-cp-dosage-row__timing-selects">
        <div className="ua-cp-timing-wrap ua-cp-dosage-daypart" ref={dayPartRef}>
          <button
            type="button"
            className={`ua-cp-timing-btn${dayPartOpen ? " is-open" : ""}${dayParts.length ? " has-value" : ""}`}
            disabled={disabled}
            onClick={() => {
              setTimingOpen(false);
              setDayPartOpen((open) => !open);
            }}
            aria-haspopup="listbox"
            aria-expanded={dayPartOpen}
          >
            <span className="ua-cp-timing-btn__label">{dayPartButtonLabel(dayParts)}</span>
            <span className="ua-cp-timing-btn__chevron" aria-hidden="true" />
          </button>
          {dayPartOpen ? (
            <div className="ua-cp-timing-menu ua-cp-timing-menu--daypart" role="listbox" aria-multiselectable="true">
              <div className="ua-cp-timing-menu__tools">
                <span className="ua-cp-timing-menu__limit">Multi-select · Max {MAX_DAY_PARTS}</span>
                <button type="button" onClick={() => onChange({ dayParts: [] })}>Clear</button>
              </div>
              {DAY_PART_OPTIONS.map((option) => {
                const checked = dayParts.includes(option.id);
                const nextCount = plannedPeriodCount(
                  checked ? dayParts.filter((id) => id !== option.id) : [...dayParts, option.id],
                  mealTimings,
                );
                const atLimit = !checked && (
                  dayParts.length >= MAX_DAY_PARTS
                  || nextCount > MAX_PERIODS
                );
                return (
                  <label key={option.id} className={`ua-cp-timing-opt${atLimit ? " is-disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={(e) => onChange({
                        dayParts: toggleLimitedOption(dayParts, option.id, e.target.checked, MAX_DAY_PARTS),
                      })}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="ua-cp-timing-wrap ua-cp-dosage-meals" ref={timingRef}>
          <button
            type="button"
            className={`ua-cp-timing-btn${timingOpen ? " is-open" : ""}${mealTimings.length ? " has-value" : ""}`}
            disabled={disabled}
            onClick={() => {
              setDayPartOpen(false);
              setTimingOpen((open) => !open);
            }}
            aria-haspopup="listbox"
            aria-expanded={timingOpen}
          >
            <span className="ua-cp-timing-btn__label">
              {mealTimings.length
                ? `${mealTimings.length} of ${MAX_TIMINGS} meal timings`
                : "Choose meal timings…"}
            </span>
            <span className="ua-cp-timing-btn__chevron" aria-hidden="true" />
          </button>
          {timingOpen ? (
            <div className="ua-cp-timing-menu" role="listbox" aria-multiselectable="true">
              <div className="ua-cp-timing-menu__tools">
                <span className="ua-cp-timing-menu__limit">Max {MAX_TIMINGS}</span>
                <button type="button" onClick={() => onChange({ mealTimings: [] })}>Clear</button>
              </div>
              {MEAL_TIMING_OPTIONS.map((option) => {
                const checked = mealTimings.includes(option.id);
                const nextCount = plannedPeriodCount(
                  dayParts,
                  checked ? mealTimings.filter((id) => id !== option.id) : [...mealTimings, option.id],
                );
                const atLimit = !checked && (
                  mealTimings.length >= MAX_TIMINGS
                  || nextCount > MAX_PERIODS
                );
                return (
                  <label key={option.id} className={`ua-cp-timing-opt${atLimit ? " is-disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={(e) => onChange({
                        mealTimings: toggleLimitedOption(mealTimings, option.id, e.target.checked, MAX_TIMINGS),
                      })}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>

        {onRemove ? (
          <button type="button" className="ua-cp-dosage-row__remove" disabled={disabled} onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>

      <p className="ua-cp-dosage-row__total">
        {periodCount
          ? `Total qty ${formatDosageAmount(Number(row.totalQuantity) || 0, unitLabel)} · Daily qty ${formatDosageAmount(dailyQuantity, unitLabel)} at each timing · ${formatDosageAmount(dayTotal, unitLabel)} across ${periodCount} timing${periodCount === 1 ? "" : "s"}.`
          : "Select morning / afternoon / evening and meal timings. Daily qty is used at each selected timing."}
      </p>
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
  const [draftRows, setDraftRows] = useState(() => [newDraftRow()]);
  const [pushIds, setPushIds] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

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
      onToast?.("Pick at least one nutrition");
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
        onToast("Saved & synced to user app. Check nutritions in the client app.");
      }
    } catch (err) {
      onToast?.(err?.message || "Could not save & sync");
    } finally {
      setSaving(false);
    }
  }

  function takenSupplementIds(exceptKey = "") {
    const ids = new Set();
    for (const row of activeDosages) {
      if (editingId && row.id === editingId) continue;
      if (row.supplementId) ids.add(row.supplementId);
    }
    for (const row of draftRows) {
      if (row.key === exceptKey) continue;
      if (row.supplementId) ids.add(row.supplementId);
    }
    return ids;
  }

  function updateDraftRow(key, patch) {
    setDraftRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function saveDraftRows() {
    const rows = draftRows.filter((row) => !isBlankDraft(row));
    if (!rows.length) {
      onToast?.("Add a nutrition before saving");
      return;
    }
    const seen = new Set();
    for (const row of rows) {
      const message = validateDraftRow(row, pool);
      if (message) {
        onToast?.(message);
        return;
      }
      if (seen.has(row.supplementId) || takenSupplementIds(row.key).has(row.supplementId)) {
        const name = pool.find((item) => item.id === row.supplementId)?.name || "This nutrition";
        onToast?.(`${name} is already on a dosage`);
        return;
      }
      seen.add(row.supplementId);
    }

    setSaving(true);
    try {
      await createUserSupplementDosageBatch(userId, rows.map(draftPayload));
      onToast(rows.length === 1 ? "Dosage saved as a draft" : `${rows.length} dosages saved as drafts`);
      setDraftRows([newDraftRow()]);
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not save dosage");
    } finally {
      setSaving(false);
    }
  }

  function beginEditDosage(dosage) {
    setEditingId(dosage.id);
    setEditDraft(dosageToDraft(dosage));
  }

  function requestSaveEditedDosage() {
    if (!editingId || !editDraft) return;
    const message = validateDraftRow(editDraft, pool);
    if (message) {
      onToast?.(message);
      return;
    }
    if (takenSupplementIds(editingId).has(editDraft.supplementId)) {
      const name = pool.find((item) => item.id === editDraft.supplementId)?.name || "This nutrition";
      onToast?.(`${name} is already on a dosage`);
      return;
    }
    const name = pool.find((item) => item.id === editDraft.supplementId)?.name
      || activeDosages.find((row) => row.id === editingId)?.name
      || "this dosage";
    setPendingConfirm({ action: "update", dosageId: editingId, name });
  }

  async function saveEditedDosage() {
    if (!editingId || !editDraft) return;
    setSaving(true);
    try {
      await updateUserSupplementDosage(userId, editingId, draftPayload(editDraft));
      onToast("Dosage updated");
      setEditingId("");
      setEditDraft(null);
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not update dosage");
    } finally {
      setSaving(false);
    }
  }

  async function pushSelectedDosages() {
    if (!pushIds.length) {
      onToast?.("Select at least one draft dosage to push");
      return;
    }
    setSaving(true);
    try {
      await pushUserSupplementDosages(userId, pushIds);
      onToast(pushIds.length === 1 ? "Dosage pushed to the app" : `${pushIds.length} dosages pushed to the app`);
      setPushIds([]);
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not push dosage");
    } finally {
      setSaving(false);
    }
  }

  function requestStopDosage(dosage) {
    if (!dosage?.id) return;
    setPendingConfirm({
      action: "stop",
      dosageId: dosage.id,
      name: dosage.name || "this dosage",
    });
  }

  async function handleStopDosage(dosageId) {
    if (!dosageId) return;
    setSaving(true);
    try {
      await stopUserSupplementDosage(userId, dosageId);
      setPushIds((ids) => ids.filter((id) => id !== dosageId));
      if (editingId === dosageId) {
        setEditingId("");
        setEditDraft(null);
      }
      onToast("Dosage stopped");
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not stop dosage");
    } finally {
      setSaving(false);
    }
  }

  async function confirmPendingAction() {
    const pending = pendingConfirm;
    setPendingConfirm(null);
    if (!pending) return;
    if (pending.action === "update") {
      await saveEditedDosage();
      return;
    }
    if (pending.action === "stop") {
      await handleStopDosage(pending.dosageId);
    }
  }

  const dosageConfirmCopy = (() => {
    const name = pendingConfirm?.name || "this dosage";
    if (pendingConfirm?.action === "stop") {
      return {
        title: `Stop “${name}”?`,
        body: "This dosage will be stopped and no longer appear as active for the client. You can set a new dosage later if needed.",
        confirmLabel: "Stop dosage",
        confirmTone: "danger",
      };
    }
    return {
      title: `Update “${name}”?`,
      body: "This will save your changes to the dosage schedule. If it is already pushed to the app, the client will see the updated plan.",
      confirmLabel: "Update dosage",
      confirmTone: "primary",
    };
  })();

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
          items: items || "Nutritions",
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

  const unpublishedDosages = activeDosages.filter(
    (row) => row.publishedToApp === false && Number(row.intervalDays) > 0,
  );
  const allDraftsSelected = unpublishedDosages.length > 0
    && unpublishedDosages.every((row) => pushIds.includes(row.id));

  if (!userId) {
    return <p className="ua-page-head__sub">Client is required to load nutritions.</p>;
  }

  return (
    <div className="ua-cp-section ua-cp-nutritions">
      <div className="ua-cp-nutritions__head">
        <h2 className="ua-cp-nutritions__title">Nutritions</h2>
        <p className="ua-cp-nutritions__sub">Nutritions recommendation, pricing &amp; dosage plan.</p>
      </div>
      <PillTabs tabs={[{ id: "recommendation", label: "Recommendation" }, { id: "dosage", label: "Dosage" }]} active={sub} onChange={setSub} size="md" />

      {loading ? <p className="ua-page-head__sub">Loading nutritions…</p> : null}
      {error && !loading ? <p className="ua-page-head__sub" style={{ color: "#b42318" }}>{error}</p> : null}
      {!isHealClient && !loading ? (
        <p className="ua-page-head__sub">Nutritions can only be assigned to Heal (paid) clients.</p>
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
                    ? "Loading nutritions pool…"
                    : availablePool.length
                      ? "+ Add nutritions from pool..."
                      : pool.length
                        ? "All nutritions from the pool are selected"
                        : "Add nutritions in Config → Nutrition bank first"}
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
            ) : (!loading ? <p className="ua-cp-rec-hint">No nutritions selected yet.</p> : null)}
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
          <p className="ua-cp-dosage-hint">
            Add one or more nutritions, pick morning / afternoon / evening and meal timings, then save. Saved dosages stay with you until you push the ones you select to the client app. The app shows each dose only on the scheduled days (daily, weekly, every 15 days, monthly, or a custom interval) from the start date until you stop it.
          </p>
          <div className="ua-cp-dosage-batch">
            {canWrite && isHealClient ? draftRows.map((row) => (
              <DosageDraftEditor
                key={row.key}
                row={row}
                pool={pool}
                takenIds={takenSupplementIds(row.key)}
                disabled={saving || poolLoading}
                onChange={(patch) => updateDraftRow(row.key, patch)}
                onRemove={draftRows.length > 1 ? () => setDraftRows((list) => list.filter((item) => item.key !== row.key)) : undefined}
              />
            )) : null}
            {canWrite && isHealClient ? (
              <div className="ua-cp-dosage-batch__actions">
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline"
                  disabled={saving || poolLoading}
                  onClick={() => setDraftRows((list) => [...list, newDraftRow()])}
                >
                  Add another dosage
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--primary"
                  disabled={saving || poolLoading}
                  onClick={saveDraftRows}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </div>
          {canWrite && isHealClient && unpublishedDosages.length ? (
            <div className="ua-cp-dosage-push">
              <label>
                <input
                  type="checkbox"
                  checked={allDraftsSelected}
                  disabled={saving}
                  onChange={(e) => setPushIds(e.target.checked ? unpublishedDosages.map((row) => row.id) : [])}
                />
                Select all drafts
              </label>
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary"
                disabled={saving || !pushIds.length}
                onClick={pushSelectedDosages}
              >
                {saving ? "Pushing…" : "Push to app"}
              </button>
            </div>
          ) : null}

          {!loading && !activeDosages.length ? (
            <p className="ua-cp-dosage-hint">No dosage schedule yet.</p>
          ) : null}

          {activeDosages.map((dosage) => (
            editingId === dosage.id && editDraft ? (
              <div key={dosage.id} className="ua-cp-dosage-edit">
                <DosageDraftEditor
                  row={editDraft}
                  pool={pool}
                  takenIds={takenSupplementIds(dosage.id)}
                  disabled={saving}
                  onChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
                />
                <div className="ua-cp-dosage-batch__actions">
                  <button type="button" className="ua-cp-btn ua-cp-btn--outline" disabled={saving} onClick={() => { setEditingId(""); setEditDraft(null); }}>
                    Cancel
                  </button>
                  <button type="button" className="ua-cp-btn ua-cp-btn--primary" disabled={saving} onClick={requestSaveEditedDosage}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <DosageCard
                key={dosage.id}
                card={mapDosageToCard(dosage)}
                canRemove={canRemove}
                canEdit={canWrite && isHealClient}
                canSelect={canWrite && isHealClient}
                checked={pushIds.includes(dosage.id)}
                onCheck={(checked) => setPushIds((ids) => (
                  checked ? [...ids, dosage.id] : ids.filter((id) => id !== dosage.id)
                ))}
                onEdit={() => beginEditDosage(dosage)}
                onRemove={() => requestStopDosage(dosage)}
              />
            )
          ))}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        tag="Dosage"
        title={dosageConfirmCopy.title}
        body={dosageConfirmCopy.body}
        confirmLabel={dosageConfirmCopy.confirmLabel}
        confirmTone={dosageConfirmCopy.confirmTone}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
