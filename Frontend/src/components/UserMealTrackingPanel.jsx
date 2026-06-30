import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const PAGE_SIZE = 8;

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "meal", label: "Meal" },
  { key: "functional_juice", label: "Functional Juice" },
  { key: "salad", label: "Salad" },
  { key: "beverage", label: "Beverage" },
  { key: "snacks", label: "Snacks" },
  { key: "protein", label: "Protein" },
];

const CATEGORY_COLORS = {
  functional_juice: "#10b981",
  salad: "#22c55e",
  meal: "#f97316",
  beverage: "#06b6d4",
  snacks: "#f59e0b",
  protein: "#8b5cf6",
};

const MEAL_TYPES = ["First", "Second", "Third", "Pre-workout", "Post-workout", "Snack", "Dinner"];
const DEFAULT_ITEM = { name: "", quantityGm: "" };

function formatDate(dateOnly) {
  if (!dateOnly) return "—";
  const d = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function shortDate(dateOnly) {
  if (!dateOnly) return "";
  const d = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function round1(n) { return Math.round(n * 10) / 10; }

/* ── Summary stat cards ── */
function MacroSummaryCards({ macroSummary }) {
  const totals = macroSummary.reduce(
    (acc, d) => ({
      protein: acc.protein + d.proteinGm,
      fats: acc.fats + d.fatsGm,
      carbs: acc.carbs + d.carbsGm,
      calories: acc.calories + d.caloriesKcal,
    }),
    { protein: 0, fats: 0, carbs: 0, calories: 0 }
  );
  const activeDays = macroSummary.filter((d) => d.caloriesKcal > 0).length || 1;
  const cards = [
    { label: "Protein", value: `${round1(totals.protein)}g`, avg: `${round1(totals.protein / activeDays)}g/day`, color: "#f97316", bg: "#fff7ed" },
    { label: "Fats", value: `${round1(totals.fats)}g`, avg: `${round1(totals.fats / activeDays)}g/day`, color: "#a855f7", bg: "#faf5ff" },
    { label: "Carbs", value: `${round1(totals.carbs)}g`, avg: `${round1(totals.carbs / activeDays)}g/day`, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Calories", value: `${Math.round(totals.calories)}`, avg: `${Math.round(totals.calories / activeDays)}/day`, color: "#eab308", bg: "#fefce8", unit: "kcal" },
  ];
  return (
    <div className="mt-summary-cards">
      {cards.map((c) => (
        <div key={c.label} className="mt-summary-card" style={{ borderTopColor: c.color, background: c.bg }}>
          <span className="mt-summary-card__label" style={{ color: c.color }}>{c.label}</span>
          <strong className="mt-summary-card__value">{c.value}{c.unit ? <sub className="mt-summary-card__unit">{c.unit}</sub> : null}</strong>
          <span className="mt-summary-card__avg">{c.avg} avg</span>
        </div>
      ))}
    </div>
  );
}

/* ── Bar chart ── */
function MacroBarChart({ title, unit, data = [], color }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mt-chart">
      <div className="mt-chart__header">
        <span className="mt-chart__title">{title}</span>
        <span className="mt-chart__unit">({unit})</span>
      </div>
      <div className="mt-chart__body">
        {data.map((d, i) => {
          const pct = max > 0 ? Math.min(90, Math.round((d.value / max) * 90)) : 0;
          return (
            <div className="mt-chart__col" key={d.date || i}>
              <div className="mt-chart__bar-outer" title={`${d.date}: ${d.value} ${unit}`}>
                <div
                  className="mt-chart__bar"
                  style={{ height: d.value > 0 ? `${Math.max(pct, 4)}%` : "0%", background: color }}
                >
                  {d.value > 0 && <span className="mt-chart__val">{d.value}</span>}
                </div>
              </div>
              <span className="mt-chart__date">{shortDate(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pagination ── */
function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="mt-pagination">
      <button className="mt-pagination__btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Prev</button>
      <div className="mt-pagination__pages">
        {pages.map((p, i) =>
          p === "…"
            ? <span key={`e-${i}`} className="mt-pagination__ellipsis">…</span>
            : <button key={p} className={`mt-pagination__page${page === p ? " mt-pagination__page--active" : ""}`} onClick={() => onChange(p)}>{p}</button>
        )}
      </div>
      <button className="mt-pagination__btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next ›</button>
      <span className="mt-pagination__info">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
    </div>
  );
}

/* ── Category badge ── */
function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || "#6b7280";
  const label = CATEGORIES.find((c) => c.key === category)?.label || category;
  return (
    <span className="mt-category-badge" style={{ background: `${color}18`, color, borderColor: `${color}40` }}>
      {label}
    </span>
  );
}

/* ── Meal log form ── */
function MealLogForm({ onSubmit, submitting, initialData = null, onCancel }) {
  const [date, setDate] = useState(initialData?.date || todayLocal());
  const [entryTime, setEntryTime] = useState(initialData?.entryTime || nowTime());
  const [category, setCategory] = useState(initialData?.category || "meal");
  const [mealType, setMealType] = useState(initialData?.mealType || "First");
  const [description, setDescription] = useState(initialData?.description || "");
  const [items, setItems] = useState(
    initialData?.items?.length
      ? initialData.items.map((i) => ({ name: i.name, quantityGm: String(i.quantityGm ?? "") }))
      : [{ ...DEFAULT_ITEM }]
  );
  const [proteinGm, setProteinGm] = useState(String(initialData?.proteinGm ?? "0"));
  const [fatsGm, setFatsGm] = useState(String(initialData?.fatsGm ?? "0"));
  const [carbsGm, setCarbsGm] = useState(String(initialData?.carbsGm ?? "0"));
  const [caloriesKcal, setCaloriesKcal] = useState(String(initialData?.caloriesKcal ?? "0"));
  const [photo, setPhoto] = useState(null);
  const photoRef = useRef(null);

  return (
    <div className="page-card mt-form-card">
      <div className="mt-form-card__header">
        <h3 className="mt-form-card__title">
          {initialData ? "Edit meal log" : "Log a meal"}
        </h3>
        {onCancel && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>✕ Cancel</button>
        )}
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          date, entryTime: entryTime || undefined, category, mealType,
          description: description.trim() || undefined,
          items: items.filter((i) => i.name.trim()).map((i) => ({
            name: i.name.trim(), quantityGm: parseFloat(i.quantityGm) || 0,
          })),
          proteinGm: parseFloat(proteinGm) || 0,
          fatsGm: parseFloat(fatsGm) || 0,
          carbsGm: parseFloat(carbsGm) || 0,
          caloriesKcal: parseFloat(caloriesKcal) || 0,
          photo: photo || undefined,
        });
      }}>
        {/* Row 1: Date / Time / Category / Type */}
        <div className="mt-form-row">
          <label className="mt-form-field">
            <span className="mt-form-field__label">Date</span>
            <input className="user-field__input" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="mt-form-field">
            <span className="mt-form-field__label">Entry Time</span>
            <input className="user-field__input" type="time" value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)} />
          </label>
          <label className="mt-form-field">
            <span className="mt-form-field__label">Category</span>
            <select className="user-field__input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="mt-form-field">
            <span className="mt-form-field__label">Meal Type</span>
            <select className="user-field__input" value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        {/* Description */}
        <label className="mt-form-field mt-form-field--full">
          <span className="mt-form-field__label">Description</span>
          <textarea className="user-field__input" rows={2} value={description}
            onChange={(e) => setDescription(e.target.value)} maxLength={1000}
            placeholder="What did you eat?" />
        </label>

        {/* Items */}
        <div className="mt-items-section">
          <div className="mt-items-section__header">
            <span className="mt-items-section__label">Food Items</span>
            <button type="button" className="btn btn--ghost btn--sm"
              onClick={() => setItems((p) => [...p, { ...DEFAULT_ITEM }])}>
              + Add item
            </button>
          </div>
          <div className="mt-items-list">
            {items.map((item, idx) => (
              <div className="mt-items-row" key={idx}>
                <input className="user-field__input mt-items-name" placeholder="Item name (e.g. Rice)"
                  value={item.name} onChange={(e) => setItems((p) => p.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                  maxLength={100} />
                <input className="user-field__input mt-items-qty" placeholder="Qty (gm)" type="number"
                  min={0} step={0.1} value={item.quantityGm}
                  onChange={(e) => setItems((p) => p.map((it, i) => i === idx ? { ...it, quantityGm: e.target.value } : it))} />
                {items.length > 1 && (
                  <button type="button" className="mt-items-remove"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="mt-macros-section">
          <span className="mt-items-section__label">Macros</span>
          <div className="mt-macros-inputs">
            {[
              { label: "Protein (g)", val: proteinGm, set: setProteinGm, color: "#f97316" },
              { label: "Fats (g)", val: fatsGm, set: setFatsGm, color: "#a855f7" },
              { label: "Carbs (g)", val: carbsGm, set: setCarbsGm, color: "#3b82f6" },
              { label: "Calories (kcal)", val: caloriesKcal, set: setCaloriesKcal, color: "#eab308" },
            ].map(({ label, val, set, color }) => (
              <label key={label} className="mt-macro-input">
                <span className="mt-macro-input__label" style={{ color }}>{label}</span>
                <input className="user-field__input" type="number" min={0} step={0.1}
                  value={val} onChange={(e) => set(e.target.value)} />
              </label>
            ))}
          </div>
        </div>

        {/* Photo + submit */}
        <div className="mt-form-footer">
          <label className="mt-form-field">
            <span className="mt-form-field__label">Photo (optional)</span>
            <input ref={photoRef} className="user-field__input" type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </label>
          <button type="submit" className="btn btn--primary mt-form-submit" disabled={submitting}>
            {submitting ? "Saving…" : initialData ? "Update log" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Meal log card ── */
function MealLogCard({ log, onDelete, onEdit, deleting, readOnly }) {
  const logId = log.id || log._id;
  return (
    <div className="mt-log-card">
      <div className="mt-log-card__top">
        <div className="mt-log-card__badges">
          <CategoryBadge category={log.category} />
          <span className="mt-log-card__type">{log.mealType}</span>
        </div>
        <div className="mt-log-card__meta">
          {log.entryTime && <span className="mt-log-card__time">{formatTime(log.entryTime)}</span>}
          <span className="mt-log-card__date">{formatDate(log.date)}</span>
        </div>
      </div>

      {log.description && <p className="mt-log-card__desc">{log.description}</p>}

      {log.items?.length > 0 && (
        <div className="mt-log-card__items">
          {log.items.map((it, i) => (
            <span key={i} className="mt-item-chip">
              {it.name}{it.quantityGm > 0 ? ` · ${it.quantityGm}g` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="mt-log-card__macros">
        <div className="mt-log-card__macro" style={{ "--mc": "#f97316" }}>
          <span className="mt-log-card__macro-val">{log.proteinGm}g</span>
          <span className="mt-log-card__macro-lbl">Protein</span>
        </div>
        <div className="mt-log-card__macro" style={{ "--mc": "#a855f7" }}>
          <span className="mt-log-card__macro-val">{log.fatsGm}g</span>
          <span className="mt-log-card__macro-lbl">Fats</span>
        </div>
        <div className="mt-log-card__macro" style={{ "--mc": "#3b82f6" }}>
          <span className="mt-log-card__macro-val">{log.carbsGm}g</span>
          <span className="mt-log-card__macro-lbl">Carbs</span>
        </div>
        <div className="mt-log-card__macro mt-log-card__macro--cal" style={{ "--mc": "#eab308" }}>
          <span className="mt-log-card__macro-val">{log.caloriesKcal}</span>
          <span className="mt-log-card__macro-lbl">kcal</span>
        </div>
      </div>

      <div className="mt-log-card__footer">
        {log.photoUrl && (
          <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-log-card__photo-link">
            📷 View photo
          </a>
        )}
        {!readOnly && (
          <div className="mt-log-card__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(log)}>Edit</button>
            <button type="button" className="btn btn--ghost btn--sm text-danger"
              onClick={() => onDelete(log)} disabled={deleting}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main panel ── */
export function UserMealTrackingPanel({
  token, userId, api, backTo,
  PageLoader, NotFoundPage, onUnauthorized, readOnly = false,
}) {
  const [logs, setLogs] = useState([]);
  const [macroSummary, setMacroSummary] = useState([]);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setError(""); setNotFound(false); setLoading(true);
    try {
      const result = await api.list(token, userId, { days });
      setLogs(result.logs ?? []);
      setMacroSummary(result.macroSummary ?? []);
      setRange(result.range ?? null);
      setPage(1);
    } catch (e) {
      if (e?.status === 401) { onUnauthorized?.(); return; }
      if (e?.status === 404 || e?.status === 403) { setNotFound(true); return; }
      setError(e.message || "Failed to load meal tracking.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId, days]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      await api.create(token, userId, payload);
      await Swal.fire({ icon: "success", title: "Meal logged!", timer: 1400, showConfirmButton: false });
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Failed to log meal", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload) => {
    if (!editingLog) return;
    setSubmitting(true);
    const logId = editingLog.id || editingLog._id;
    try {
      await api.update(token, userId, logId, payload);
      await Swal.fire({ icon: "success", title: "Updated!", timer: 1200, showConfirmButton: false });
      setEditingLog(null);
      await load();
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Update failed", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (log) => {
    const logId = log.id || log._id;
    const confirm = await Swal.fire({
      icon: "warning", title: "Delete meal log?", text: "This cannot be undone.",
      showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;
    setDeletingId(logId);
    try {
      await api.remove(token, userId, logId);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1100, showConfirmButton: false });
      await load();
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    } finally {
      setDeletingId("");
    }
  };

  const filteredLogs = activeCategory === "all"
    ? logs
    : logs.filter((l) => l.category === activeCategory);

  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartData = macroSummary.map((d) => ({
    date: d.date, day: d.day,
    protein: d.proteinGm, fats: d.fatsGm, carbs: d.carbsGm, calories: d.caloriesKcal,
  }));

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading meal tracking…" />;

  return (
    <div className="user-page">
      {/* Header */}
      <div className="user-page__toolbar">
        {backTo && (
          <Link to={backTo} className="user-back-btn" aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        )}
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Meal Tracking</h2>
          {range && (
            <p className="user-page__subtitle">{range.startDate} → {range.endDate}</p>
          )}
        </div>
        <div className="user-page__toolbar-actions">
          <select
            className="user-field__input"
            style={{ width: "auto", minWidth: 90 }}
            value={days}
            onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}
          >
            {[7, 14, 30].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
          {!readOnly && !showForm && !editingLog && (
            <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
              + Log meal
            </button>
          )}
        </div>
      </div>

      {error && <p className="user-list-error">{error}</p>}

      {/* Forms */}
      {!readOnly && showForm && (
        <MealLogForm onSubmit={handleCreate} submitting={submitting} onCancel={() => setShowForm(false)} />
      )}
      {!readOnly && editingLog && (
        <MealLogForm initialData={editingLog} onSubmit={handleUpdate} submitting={submitting}
          onCancel={() => setEditingLog(null)} />
      )}

      {/* Summary cards */}
      {macroSummary.length > 0 && <MacroSummaryCards macroSummary={macroSummary} />}

      {/* Charts */}
      <div className="page-card mt-charts-card">
        <h3 className="form-card__title">Daily Macro Breakdown</h3>
        <div className="mt-charts-grid">
          <MacroBarChart title="PROTEIN" unit="gm" color="#f97316"
            data={chartData.map((d) => ({ date: d.date, day: d.day, value: d.protein }))} />
          <MacroBarChart title="FATS" unit="gm" color="#a855f7"
            data={chartData.map((d) => ({ date: d.date, day: d.day, value: d.fats }))} />
          <MacroBarChart title="CARBS" unit="gm" color="#3b82f6"
            data={chartData.map((d) => ({ date: d.date, day: d.day, value: d.carbs }))} />
          <MacroBarChart title="CALORIES" unit="kcal" color="#eab308"
            data={chartData.map((d) => ({ date: d.date, day: d.day, value: d.calories }))} />
        </div>
      </div>

      {/* Category tabs + log list */}
      <div className="page-card">
        <div className="mt-toolbar">
          <div className="mt-category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`mt-category-tab${activeCategory === cat.key ? " mt-category-tab--active" : ""}`}
                onClick={() => { setActiveCategory(cat.key); setPage(1); }}
              >
                {cat.label}
                {cat.key !== "all" && (
                  <span className="mt-category-tab__count">
                    {logs.filter((l) => l.category === cat.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="table-placeholder">Refreshing…</p>}

        {!loading && filteredLogs.length === 0 && (
          <p className="table-placeholder">
            {activeCategory === "all"
              ? "No meal logs in this period."
              : `No ${CATEGORIES.find((c) => c.key === activeCategory)?.label} logs in this period.`}
          </p>
        )}

        <div className="mt-log-grid">
          {pagedLogs.map((log) => (
            <MealLogCard
              key={log.id || log._id}
              log={log}
              onDelete={handleDelete}
              onEdit={(l) => { setEditingLog(l); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              deleting={deletingId === (log.id || log._id)}
              readOnly={readOnly}
            />
          ))}
        </div>

        <Pagination
          page={page}
          total={filteredLogs.length}
          pageSize={PAGE_SIZE}
          onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </div>
    </div>
  );
}
