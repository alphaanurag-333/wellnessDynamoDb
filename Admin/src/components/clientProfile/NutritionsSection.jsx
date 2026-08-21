import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import { formatLongDate } from "../../api/usersApi.js";
import {
  createUserSupplementDosage,
  createUserSupplementRecommendation,
  listActiveSupplementPool,
  listUserSupplementDosages,
  listUserSupplementRecommendations,
  stopUserSupplementDosage,
} from "../../api/supplementAssignmentApi.js";
import { formatSupplementOption } from "../../data/userDetailData.js";

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

  const selfBilling = recommendation.deliveryOption === "self_billing";
  const requestedOn = formatLongDate(recommendation.deliveryRequestedAt);
  const billedOn = formatLongDate(recommendation.billUploadedAt);
  const statusLabel = selfBilling
    ? (billedOn ? "Bill uploaded" : "Awaiting bill")
    : (requestedOn ? "Delivery requested" : "Awaiting client request");
  const statusTone = billedOn || requestedOn ? "saved" : "pending";

  return (
    <div className="ua-cp-nut-log">
      <div className="ua-cp-nut-log__head">
        <strong>Fulfilment status</strong>
        <span className={`ua-cp-nut-log__status ua-cp-nut-log__status--${statusTone}`}>{statusLabel}</span>
      </div>
      {selfBilling ? (
        <p className="ua-cp-nut-log__hint">
          {billedOn
            ? `Client uploaded a purchase bill on ${billedOn}.`
            : "The client will buy these supplements and upload a PDF bill in the app."}
        </p>
      ) : (
        <p className="ua-cp-nut-log__hint">
          {requestedOn
            ? `Client asked you to order this on ${requestedOn}.`
            : "The client can request delivery from you in the app after this recommendation is saved."}
        </p>
      )}
      {recommendation.billPdfUrl ? (
        <a className="ua-cp-nut-log__add" href={recommendation.billPdfUrl} target="_blank" rel="noreferrer">
          Open uploaded bill
        </a>
      ) : null}
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
    return !sameItems(selected, recommended?.items || []) || fulfilment !== savedOption;
  }, [fulfilment, recommended, selected]);

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
      } else {
        setRecommended(null);
        setHistory([]);
        setSelected([]);
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

  async function saveRecommendation() {
    if (!selected.length) {
      onToast?.("Pick at least one supplement");
      return;
    }
    setSaving(true);
    try {
      await createUserSupplementRecommendation(userId, {
        items: selected,
        deliveryOption: fulfilment,
      });
      onToast("Saved & synced to user app");
      await load({ silent: true });
    } catch (err) {
      onToast?.(err?.message || "Could not save recommendation");
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
    if (recommended) rows.push(recommendationToHistoryRow(recommended));
    history.forEach((entry) => rows.push(recommendationToHistoryRow(entry)));
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
              <button type="button" disabled={!canWrite || saving || !isHealClient} className={`ua-cp-fulfil__opt${fulfilment === "delivery" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => setFulfilment("delivery")}>
                <strong>Send it to me</strong>
                <span>Request delivery from coach</span>
              </button>
              <button type="button" disabled={!canWrite || saving || !isHealClient} className={`ua-cp-fulfil__opt${fulfilment === "self" ? " ua-cp-fulfil__opt--active" : ""}`} onClick={() => setFulfilment("self")}>
                <strong>Self billing</strong>
                <span>Client buys &amp; uploads bill (PDF)</span>
              </button>
            </div>

            <FulfilmentStatus recommendation={recommended} />

            {canWrite && isHealClient ? (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block"
                disabled={saving || !selected.length || (!dirty && Boolean(recommended))}
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
                  <div>{o.date}</div>
                  <div><div>{o.items}</div><div className="ua-cp-order-table__sub">{o.type}</div></div>
                  <div>Rs. {o.amount.toLocaleString("en-IN")}</div>
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
              <button type="button" className="ua-cp-timing-btn" disabled={!canWrite || saving || !isHealClient} onClick={() => setTimingOpen((o) => !o)}>
                {addPeriods.length ? `${addPeriods.length} timings selected` : "Choose timings…"}
              </button>
              {timingOpen ? (
                <div className="ua-cp-timing-menu">
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
            <input type="date" value={addStart} onChange={(e) => setAddStart(e.target.value)} className="ua-cp-dosage-date" disabled={!canWrite || saving || !isHealClient} />
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
