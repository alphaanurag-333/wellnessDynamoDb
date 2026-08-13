import { useMemo, useState } from "react";
import { PillTabs } from "../shared.jsx";
import { AtAGlanceSection } from "./AtAGlanceSection.jsx";
import { BodyAnalyticsSection } from "./BodyAnalyticsSection.jsx";
import { InternalParametersSection } from "./InternalParametersSection.jsx";
import { LaunchSection } from "./LaunchSection.jsx";
import { getTierActions } from "../../data/userDetailData.js";
import { tierBadgeClass, tierBadgeStyle, tierLabel, normalizeTier } from "../../data/usersData.js";

export { AtAGlanceSection, BodyAnalyticsSection, InternalParametersSection, LaunchSection };
export { HealthProgressSection } from "./HealthProgressSection.jsx";
import {
  DOSAGE_CARDS,
  ORDER_HISTORY,
  SUPPLEMENT_POOL,
  TIMING_OPTIONS,
  UNIT_OPTIONS,
} from "../../data/userDetailData.js";

function DosageBadge({ label, tone }) {
  return <span className={`ua-cp-dosage ua-cp-dosage--${tone}`}>{label}</span>;
}

export function PersonalDetailsSection({ user, onToast }) {
  const [editing, setEditing] = useState(false);
  const [manualTier, setManualTier] = useState(null);
  const [form, setForm] = useState({
    name: user.name,
    dob: user.dob,
    phone: user.phone,
    whatsapp: user.whatsapp,
    address: user.address,
    state: user.state,
    goal: user.goal,
  });

  const currentTier = normalizeTier(manualTier ?? user.tier);
  const tierActions = getTierActions(currentTier, user.ageDays ?? 30);
  const tierBadgeTone = tierBadgeStyle(currentTier);
  const displayTierLabel = tierLabel(currentTier);
  const tierConverted = manualTier !== null;

  const fields = [
    { key: "name", label: "Full name", editable: true },
    { key: "dob", label: "Date of birth", editable: true },
    { key: "email", label: "Email", value: user.email, editable: false },
    { key: "phone", label: "Phone", editable: true },
    { key: "whatsapp", label: "WhatsApp", editable: true },
    { key: "address", label: "Complete address", editable: true },
    { key: "state", label: "State", editable: true },
    { key: "tier", label: "Plan / tier", value: displayTierLabel, editable: false },
    { key: "goal", label: "Goal", editable: true },
    { key: "coach", label: "Assigned coach", value: user.coach, editable: false },
    { key: "joined", label: "Joined", value: user.joined, editable: false },
    { key: "termsIp", label: "Terms & conditions IP", value: user.termsIp, editable: false },
    { key: "termsAccepted", label: "Terms & conditions accepted", value: user.termsAccepted, editable: false },
  ];

  function save() {
    setEditing(false);
    onToast("Personal details saved");
  }

  function convertTier() {
    if (!tierActions.canConvert) return;
    setManualTier(tierActions.upTier);
    onToast(`${user.name} moved to ${tierLabel(tierActions.upTier)} by Admin`);
  }

  function downgradeTier() {
    if (!tierActions.canDowngrade) return;
    setManualTier(tierActions.downTier);
    onToast(`${user.name} moved down to ${tierLabel(tierActions.downTier)} by Admin`);
  }

  function revertTier() {
    setManualTier(null);
    onToast(`Manual conversion undone for ${user.name}`);
  }

  return (
    <div className="ua-cp-section ua-cp-personal">
      <div className="ua-cp-personal__head">
        <div className="ua-cp-personal__head-copy">
          <h2 className="ua-cp-personal__title">Personal details</h2>
          <p className="ua-cp-personal__email">{user.email}</p>
        </div>
        <div className="ua-cp-personal__actions">
          {editing ? (
            <>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={save}>Save changes</button>
            </>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setEditing(true)}>✎ Edit</button>
          )}
        </div>
      </div>
      <div className="ua-cp-personal__badges">
        <span className={`ua-cp-tier-badge ua-cp-tier-badge--${tierBadgeClass(currentTier)}`} style={tierBadgeTone}>{displayTierLabel}</span>
        {tierActions.canConvert ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--up" title={tierActions.convertTitle} onClick={convertTier}>
            {tierActions.convertLabel}
          </button>
        ) : null}
        {tierActions.canDowngrade ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--down" title={tierActions.downgradeTitle} onClick={downgradeTier}>
            {tierActions.downgradeLabel}
          </button>
        ) : null}
        {tierConverted ? (
          <button type="button" className="ua-cp-tier-action ua-cp-tier-action--undo" title="Undo this manual change" onClick={revertTier}>
            <span className="ua-cp-tier-action__manual">Manual</span>
            <span className="ua-cp-tier-action__sep" aria-hidden="true">·</span>
            <span className="ua-cp-tier-action__undo">undo</span>
          </button>
        ) : null}
        <span className="ua-cp-status-badge"><span className="ua-cp-status-badge__dot" />{user.status || "Active"}</span>
      </div>
      <div className="ua-cp-personal__card">
        {fields.map((f) => {
          const val = f.value ?? form[f.key] ?? "";
          return (
            <div key={f.label} className="ua-cp-field">
              <span className="ua-cp-field__label">{f.label}</span>
              {editing && f.editable ? (
                <input className="ua-cp-field__input" value={val} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
              ) : (
                <span className="ua-cp-field__value">{val}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NutritionsSection({ onToast }) {
  const [sub, setSub] = useState("recommendation");
  const [selected, setSelected] = useState([{ ...SUPPLEMENT_POOL[1], qty: 2 }]);
  const [fulfilment, setFulfilment] = useState("delivery");
  const [poolPick, setPoolPick] = useState("");
  const [dosages, setDosages] = useState(DOSAGE_CARDS);
  const [addSupp, setAddSupp] = useState(SUPPLEMENT_POOL[3].name);
  const [addTimings, setAddTimings] = useState([]);
  const [addQty, setAddQty] = useState(1);
  const [addUnit, setAddUnit] = useState("Cap");
  const [timingOpen, setTimingOpen] = useState(false);

  const billing = useMemo(() => selected.reduce((sum, s) => sum + s.price * s.qty, 0), [selected]);

  function addFromPool() {
    const item = SUPPLEMENT_POOL.find((s) => s.id === poolPick);
    if (!item) return;
    setSelected((list) => {
      const existing = list.find((x) => x.id === item.id);
      if (existing) return list.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...list, { ...item, qty: 1 }];
    });
    setPoolPick("");
    onToast(`${item.name} added`);
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
                {SUPPLEMENT_POOL.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  <button type="button" onClick={() => setSelected((list) => list.map((x) => x.id === s.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>−</button>
                  <span>{s.qty}</span>
                  <button type="button" onClick={() => setSelected((list) => list.map((x) => x.id === s.id ? { ...x, qty: x.qty + 1 } : x))}>+</button>
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
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block" onClick={() => onToast("Saved & synced to user app")}>Save &amp; sync to user app</button>
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
            <div className="ua-cp-timing-wrap">
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
                      <input type="checkbox" checked={addTimings.includes(t)} onChange={(e) => setAddTimings((list) => e.target.checked ? [...list, t] : list.filter((x) => x !== t))} />
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
            <button type="button" className="ua-cp-btn ua-cp-btn--primary" disabled={!addTimings.length} onClick={() => { onToast(`Added ${addSupp} ×${addTimings.length}`); setAddTimings([]); setTimingOpen(false); }}>
              Add{addTimings.length ? ` ×${addTimings.length}` : ""}
            </button>
          </div>

          {dosages.map((card) => (
            <div key={card.id} className="ua-cp-dosage-card">
              <div className="ua-cp-dosage-card__head">
                <strong>{card.name}</strong>
                <span>Daily dosage: {card.daily}</span>
                <button type="button" className="ua-cp-dosage-card__close" onClick={() => setDosages((list) => list.filter((x) => x.id !== card.id))}>×</button>
              </div>
              <div className="ua-cp-dosage-meals">
                {card.meals.map((meal) => (
                  <div key={meal.label} className="ua-cp-dosage-meal">
                    <div className={`ua-cp-dosage-circle${meal.done ? " ua-cp-dosage-circle--done" : ""}`}>{meal.done ? "✓" : meal.count}</div>
                    <div className="ua-cp-dosage-meal__label">{meal.label}</div>
                    <div className="ua-cp-dosage-meal__amt">{meal.amount}</div>
                  </div>
                ))}
              </div>
              <div className="ua-cp-dosage-card__foot">
                <span>{card.range}</span>
                <div className="ua-cp-dosage-progress"><span style={{ width: `${card.pct}%` }} /></div>
                <span>{card.pct}% Completed</span>
              </div>
            </div>
          ))}
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--block" onClick={() => onToast("Dosage saved & synced")}>Save &amp; sync to user app</button>
        </>
      )}
    </div>
  );
}

export function PlaceholderSection({ title, subtitle }) {
  return (
    <div className="ua-cp-section ua-cp-placeholder">
      <h2 className="ua-cp-placeholder__title">{title}</h2>
      {subtitle ? <p className="ua-cp-placeholder__sub">{subtitle}</p> : null}
      <p className="ua-cp-placeholder__note">This section will be connected to live data soon.</p>
    </div>
  );
}
