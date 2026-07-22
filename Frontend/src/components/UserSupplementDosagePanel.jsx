import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveSupplementCatalog } from "../wellnessCoach/api/coachSupplementCatalog.js";

import { formatDate } from "../admin/utils/formatDate.js";
const PERIOD_ROWS = [
  { key: "morning", label: "Morning (6am – 12pm)" },
  { key: "afternoon", label: "Afternoon (12pm – 5pm)" },
  { key: "evening", label: "Evening/Night (5pm – 12am)" },
];


function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function periodLabel(period) {
  return PERIOD_ROWS.find((row) => row.key === period)?.label || period;
}

function defaultPeriodState() {
  return {
    morning: { enabled: false, quantity: 1, mealRelation: "after" },
    afternoon: { enabled: false, quantity: 1, mealRelation: "after" },
    evening: { enabled: false, quantity: 1, mealRelation: "after" },
  };
}

function DosageCard({ dosage, onStop, stopping, canStop }) {
  const id = dosage.id || dosage._id;
  const isActive = dosage.status === "active";

  return (
    <article className="supplement-dosage-card">
      <div className="supplement-dosage-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      </div>
      <div className="supplement-dosage-card__content">
        <div className="supplement-dosage-card__top">
          <div className="supplement-dosage-card__title">{dosage.name}</div>
          <div className="supplement-dosage-card__actions">
            <span className={`catalog-picker__badge${isActive ? "" : " catalog-picker__badge--type"}`}>
              {isActive ? "Active" : "Stopped"}
            </span>
            {canStop && isActive ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm text-danger"
                onClick={() => onStop(dosage)}
                disabled={stopping}
              >
                Stop
              </button>
            ) : null}
          </div>
        </div>
        <div className="supplement-dosage-card__meta">
          {formatDate(dosage.startDate)} – {formatDate(dosage.endDate)} · {dosage.totalPerDay}{" "}
          {dosage.unit}/day · {dosage.durationDays} days · {dosage.progressPercent ?? 0}% complete
        </div>
        {(dosage.periods || []).length > 0 ? (
          <div className="plan-chip-list supplement-dosage-card__periods">
            {(dosage.periods || []).map((row) => (
              <div key={`${id}-${row.period}`} className="plan-chip plan-chip--compact">
                <span className="plan-chip__name">{periodLabel(row.period)}</span>
                <span className="plan-chip__meta">
                  {row.quantity} {dosage.unit} · {row.mealRelation === "before" ? "Before meal" : "After meal"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="supplement-dosage-empty supplement-dosage-empty--inline">No period details.</p>
        )}
      </div>
    </article>
  );
}

export function UserSupplementDosagePanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [catalog, setCatalog] = useState([]);
  const [dosages, setDosages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [stoppingId, setStoppingId] = useState("");
  const [supplementId, setSupplementId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [periods, setPeriods] = useState(defaultPeriodState);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalogRes, dosageRes] = await Promise.all([
        fetchActiveSupplementCatalog(),
        api.list(token, userId),
      ]);
      setCatalog(catalogRes.supplements ?? []);
      setDosages(dosageRes.dosages ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load supplement dosages.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSupplement = useMemo(
    () => catalog.find((row) => (row.id || row._id) === supplementId) || null,
    [catalog, supplementId]
  );

  const enabledPeriods = useMemo(
    () =>
      PERIOD_ROWS.filter((row) => periods[row.key]?.enabled).map((row) => ({
        period: row.key,
        quantity: Number(periods[row.key].quantity) || 0,
        mealRelation: periods[row.key].mealRelation,
      })),
    [periods]
  );

  const totalPerDay = useMemo(
    () => enabledPeriods.reduce((sum, row) => sum + row.quantity, 0),
    [enabledPeriods]
  );

  const durationDays = useMemo(() => {
    const packSize = Number(selectedSupplement?.packSize) || 0;
    if (!packSize || totalPerDay <= 0) return 0;
    return Math.floor(packSize / totalPerDay);
  }, [selectedSupplement, totalPerDay]);

  const endDate = useMemo(() => {
    if (!startDate || durationDays < 1) return "";
    return addDays(startDate, durationDays - 1);
  }, [durationDays, startDate]);

  const activeDosages = useMemo(() => dosages.filter((d) => d.status === "active"), [dosages]);
  const pastDosages = useMemo(() => dosages.filter((d) => d.status !== "active"), [dosages]);

  const updatePeriod = (key, patch) => {
    setPeriods((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token || !userId || readOnly) return;
    if (!supplementId) {
      await Swal.fire({ icon: "warning", title: "Select a supplement." });
      return;
    }
    if (!enabledPeriods.length) {
      await Swal.fire({ icon: "warning", title: "Enable at least one period." });
      return;
    }

    setSaving(true);
    try {
      await api.create(token, userId, {
        supplementId,
        startDate,
        periods: enabledPeriods,
      });
      await Swal.fire({
        icon: "success",
        title: "Dosage schedule created",
        timer: 1500,
        showConfirmButton: false,
      });
      setSupplementId("");
      setPeriods(defaultPeriodState());
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else {
        await Swal.fire({
          icon: "error",
          title: "Create failed",
          text: err.message || "Could not create dosage schedule.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStop = async (dosage) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Stop dosage schedule?",
      text: `"${dosage.name}" will be stopped for this client.`,
      showCancelButton: true,
      confirmButtonText: "Stop",
    });
    if (!confirm.isConfirmed) return;

    const dosageId = dosage.id || dosage._id;
    setStoppingId(dosageId);
    try {
      await api.stop(token, userId, dosageId);
      await Swal.fire({ icon: "success", title: "Stopped", timer: 1200, showConfirmButton: false });
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else {
        await Swal.fire({
          icon: "error",
          title: "Stop failed",
          text: err.message || "Could not stop dosage schedule.",
        });
      }
    } finally {
      setStoppingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading supplement dosage…" />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel client-hub-module-panel" : "user-page"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Supplement Dosage</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Create a per-period dosage schedule. Duration is calculated from pack size and daily total.
          </p>
        </div>
      ) : (
        <div className="user-page__toolbar">
          <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
          <div className="user-page__toolbar-text">
            <h2 className="user-page__title">Supplement Dosage</h2>
            <p className="user-page__subtitle">
              Create a per-period dosage schedule. Duration is calculated from pack size and daily total.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={embedded ? "client-hub-module-panel__content" : "page-card diet-plan-page"}>
        {!readOnly ? (
          <form
            className={`form-card diet-plan-upload${embedded ? " form-card--embedded" : ""}`}
            onSubmit={handleCreate}
          >
            <h3 className="form-card__title">New dosage schedule</h3>

            <div className="row g-3" style={{ marginTop: 16 }}>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Supplement <span className="required-dot">*</span>
                </span>
                <select
                  className="user-field__input"
                  value={supplementId}
                  onChange={(e) => setSupplementId(e.target.value)}
                >
                  <option value="">Select supplement</option>
                  {catalog.map((row) => {
                    const id = row.id || row._id;
                    return (
                      <option key={id} value={id}>
                        {row.name} ({row.packSize} {row.unit})
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Start date <span className="required-dot">*</span>
                </span>
                <input
                  type="date"
                  className="user-field__input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Daily periods <span className="required-dot">*</span>
                </span>
              </div>

              <div className="table-scroll supplement-dosage-periods">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="supplement-dosage-periods__col-period">Period</th>
                      <th className="data-table__col--shrink">Enabled</th>
                      <th className="data-table__col--shrink">Quantity</th>
                      <th className="data-table__col--shrink">Meal timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERIOD_ROWS.map((row) => (
                      <tr key={row.key}>
                        <td className="supplement-dosage-periods__col-period">{row.label}</td>
                        <td className="supplement-dosage-periods__col-enabled">
                          <input
                            type="checkbox"
                            checked={periods[row.key].enabled}
                            onChange={(e) => updatePeriod(row.key, { enabled: e.target.checked })}
                            aria-label={`Enable ${row.label}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className="user-field__input supplement-dosage-periods__input supplement-dosage-periods__qty"
                            disabled={!periods[row.key].enabled}
                            value={periods[row.key].quantity}
                            onChange={(e) =>
                              updatePeriod(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="user-field__input supplement-dosage-periods__input supplement-dosage-periods__meal"
                            disabled={!periods[row.key].enabled}
                            value={periods[row.key].mealRelation}
                            onChange={(e) => updatePeriod(row.key, { mealRelation: e.target.value })}
                          >
                            <option value="before">Before meal</option>
                            <option value="after">After meal</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="supplement-dosage-preview">
              <span className="supplement-dosage-preview__label">Schedule preview</span>
              {selectedSupplement ? (
                <div className="supplement-dosage-preview__grid">
                  <div>
                    <span className="data-table__muted">Daily total</span>
                    <strong>
                      {totalPerDay} {selectedSupplement.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="data-table__muted">Duration</span>
                    <strong>{durationDays || 0} days</strong>
                  </div>
                  <div>
                    <span className="data-table__muted">End date</span>
                    <strong>{endDate ? formatDate(endDate) : "—"}</strong>
                  </div>
                </div>
              ) : (
                <p className="supplement-dosage-preview__empty">
                  Select a supplement and enable at least one period to preview duration.
                </p>
              )}
            </div>

            <div className="supplement-dosage-form__footer">
              <p className="supplement-dosage-form__hint">
                {enabledPeriods.length
                  ? `${enabledPeriods.length} period(s) enabled for this schedule.`
                  : "Enable one or more periods to create a schedule."}
              </p>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving || !supplementId || !enabledPeriods.length}
              >
                {saving ? "Creating…" : "Create dosage schedule"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">Active schedules ({activeDosages.length})</h3>
          {activeDosages.length === 0 ? (
            <p className="supplement-dosage-empty">No active dosage schedules.</p>
          ) : (
            <div className="diet-plan-list">
              {activeDosages.map((dosage) => (
                <DosageCard
                  key={dosage.id || dosage._id}
                  dosage={dosage}
                  onStop={handleStop}
                  stopping={stoppingId === (dosage.id || dosage._id)}
                  canStop={!readOnly}
                />
              ))}
            </div>
          )}
        </section>

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">Past schedules ({pastDosages.length})</h3>
          {pastDosages.length === 0 ? (
            <p className="supplement-dosage-empty">No past dosage schedules.</p>
          ) : (
            <div className="diet-plan-list">
              {pastDosages.map((dosage) => (
                <DosageCard
                  key={dosage.id || dosage._id}
                  dosage={dosage}
                  onStop={handleStop}
                  stopping={stoppingId === (dosage.id || dosage._id)}
                  canStop={!readOnly}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
