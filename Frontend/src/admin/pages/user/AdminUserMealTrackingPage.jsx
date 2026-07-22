import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetUserMealTracking, adminDeleteMealLog } from "../../api/adminMealTracking.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { formatDate } from "../../utils/formatDate.js";

const PAGE_SIZE = 10;

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

function formatDateUtc(dateOnly) {
  if (!dateOnly) return "—";
  return formatDate(`${dateOnly}T00:00:00Z`, { timeZone: "UTC" });
}

function shortDate(dateOnly) {
  if (!dateOnly) return "";
  const formatted = formatDate(`${dateOnly}T00:00:00Z`, { timeZone: "UTC" });
  if (formatted === "—") return dateOnly;
  // "20 Jul 2026" → "20 Jul"
  return formatted.replace(/\s+\d{4}$/, "");
}

function formatTime(hhmm) {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function round1(n) { return Math.round(n * 10) / 10; }

/* ── Macro summary stat cards ── */
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
    { label: "Calories", value: `${Math.round(totals.calories)} kcal`, avg: `${Math.round(totals.calories / activeDays)} kcal/day`, color: "#eab308", bg: "#fefce8" },
  ];

  return (
    <div className="mt-summary-cards">
      {cards.map((c) => (
        <div key={c.label} className="mt-summary-card" style={{ borderTopColor: c.color, background: c.bg }}>
          <span className="mt-summary-card__label" style={{ color: c.color }}>{c.label}</span>
          <strong className="mt-summary-card__value">{c.value}</strong>
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
                  style={{
                    height: d.value > 0 ? `${Math.max(pct, 4)}%` : "0%",
                    background: color,
                  }}
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
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="mt-pagination">
      <button
        className="mt-pagination__btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹ Prev
      </button>
      <div className="mt-pagination__pages">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="mt-pagination__ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`mt-pagination__page${page === p ? " mt-pagination__page--active" : ""}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className="mt-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next ›
      </button>
      <span className="mt-pagination__info">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
    </div>
  );
}

/* ── Category badge ── */
function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || "#6b7280";
  const label = CATEGORIES.find((c) => c.key === category)?.label || category;
  return (
    <span
      className="mt-category-badge"
      style={{ background: `${color}18`, color, borderColor: `${color}40` }}
    >
      {label}
    </span>
  );
}

/* ── Table row ── */
function MealLogRow({ log, onDelete, deleting }) {
  const logId = log.id || log._id;
  return (
    <tr className="mt-table-row">
      <td>
        <div className="mt-table-row__meal">
          <CategoryBadge category={log.category} />
          <span className="mt-table-row__type">{log.mealType}</span>
        </div>
        {log.description && (
          <div className="data-table__muted">{log.description}</div>
        )}
        {log.items?.length > 0 && (
          <div className="mt-table-row__items">
            {log.items.map((it, i) => (
              <span key={i} className="mt-item-chip">
                {it.name}{it.quantityGm > 0 ? ` ${it.quantityGm}g` : ""}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="mt-table-row__date-col">
        <div>{formatDateUtc(log.date)}</div>
        <div className="data-table__muted">{formatTime(log.entryTime)}</div>
      </td>
      <td>
        <div className="mt-macros-row">
          <span className="mt-macro-pill mt-macro-pill--protein">{log.proteinGm}g P</span>
          <span className="mt-macro-pill mt-macro-pill--fats">{log.fatsGm}g F</span>
          <span className="mt-macro-pill mt-macro-pill--carbs">{log.carbsGm}g C</span>
          <span className="mt-macro-pill mt-macro-pill--cal">{log.caloriesKcal} kcal</span>
        </div>
      </td>
      <td>
        <span className="mt-logged-by">
          {log.loggedByRole === "assistant_wellness_coach" ? "Assistant" : "Coach"}
        </span>
      </td>
      <td>
        <div className="row-actions row-actions--text">
          {log.photoUrl && (
            <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              Photo
            </a>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm text-danger"
            onClick={() => onDelete(logId)}
            disabled={deleting}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main page ── */
export function AdminUserMealTrackingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [macroSummary, setMacroSummary] = useState([]);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [days, setDays] = useState(7);
  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!adminToken || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const result = await adminGetUserMealTracking(adminToken, userId, { days });
      setUser(result.user);
      setLogs(result.logs ?? []);
      setMacroSummary(result.macroSummary ?? []);
      setRange(result.range ?? null);
      setPage(1);
    } catch (e) {
      if (e?.status === 401) { dispatch(logout()); return; }
      if (e?.status === 404) { setNotFound(true); return; }
      setError(e.message || "Failed to load meal tracking.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, userId, days]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (logId) => {
    const confirm = await Swal.fire({
      icon: "warning", title: "Delete meal log?", text: "This cannot be undone.",
      showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(logId);
    try {
      await adminDeleteMealLog(adminToken, userId, logId);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      await load();
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
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
    protein: d.proteinGm, fats: d.fatsGm,
    carbs: d.carbsGm, calories: d.caloriesKcal,
  }));

  if (notFound) return <NotFoundPage />;
  if (loading) return <UserPageLoadingState label="Loading meal tracking…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Meal Tracking"
        subtitle={user ? `${user.name} · ${user.email}` : "Macro insights"}
        onBack={() => navigate(-1)}
        actions={
          <>
            <select
              className="user-field__input"
              style={{ width: "auto", minWidth: 100 }}
              value={days}
              onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}
            >
              {[7, 14, 30].map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
            <Link to={`/admin/users/${userId}`} className="btn btn--ghost">
              User details
            </Link>
          </>
        }
      />

      {error && <p className="user-list-error">{error}</p>}

      {/* Period + summary */}
      {range && (
        <p className="mt-range-label">{range.startDate} → {range.endDate} · {logs.length} entries</p>
      )}

      <MacroSummaryCards macroSummary={macroSummary} />

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

      {/* Category tabs + table */}
      <div className="page-card">
        <div className="mt-toolbar">
          <h3 className="form-card__title" style={{ margin: 0 }}>Meal Logs</h3>
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

        <div className="table-scroll">
          <table className="data-table mt-table">
            <thead>
              <tr>
                <th>Meal</th>
                <th>Date &amp; Time</th>
                <th>Macros</th>
                <th>Logged by</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className="table-placeholder">
                      {activeCategory === "all"
                        ? "No meal logs in this period."
                        : `No ${CATEGORIES.find((c) => c.key === activeCategory)?.label} logs in this period.`}
                    </p>
                  </td>
                </tr>
              ) : (
                pagedLogs.map((log) => (
                  <MealLogRow
                    key={log.id || log._id}
                    log={log}
                    onDelete={handleDelete}
                    deleting={deletingId === (log.id || log._id)}
                  />
                ))
              )}
            </tbody>
          </table>
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
