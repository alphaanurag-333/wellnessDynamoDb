import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveSupplementCatalog } from "../wellnessCoach/api/coachSupplementCatalog.js";

const PERIOD_ROWS = [
  { key: "morning", label: "Morning (6am - 12pm)" },
  { key: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { key: "evening", label: "Evening/Night (5pm - 12pm)" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div>
            <div className="diet-plan-card__title">{dosage.name}</div>
            <div className="diet-plan-card__date">
              {formatDate(dosage.startDate)} – {formatDate(dosage.endDate)} · {dosage.totalPerDay}{" "}
              {dosage.unit}/day · {dosage.durationDays} days · {dosage.progressPercent ?? 0}%
              complete
            </div>
          </div>
        </div>
        {canStop && dosage.status === "active" ? (
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
      <div className="assignment-card__body">
        <ul className="mb-0">
          {(dosage.periods || []).map((row) => (
            <li key={`${id}-${row.period}`}>
              {row.period}: {row.quantity} {dosage.unit} ({row.mealRelation} meal)
            </li>
          ))}
        </ul>
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

  if (loading) return <PageLoader />;
  if (notFound) return <NotFoundPage />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel" : "page-card"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Supplement Dosage</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Create a per-period dosage schedule. Duration is calculated from pack size and daily total.
          </p>
        </div>
      ) : (
        <div className="page-card__header">
          <div>
            <Link to={backTo} className="btn btn--ghost btn--sm mb-2">
              ← Back to clients
            </Link>
            <h1 className="page-card__title">Supplement Dosage</h1>
            <p className="page-card__subtitle">
              Create a per-period dosage schedule. Duration is calculated from pack size and daily total.
            </p>
          </div>
        </div>
      )}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!readOnly ? (
        <form className={`form-card mb-4${embedded ? " form-card--embedded" : ""}`} onSubmit={handleCreate}>
          <h2 className="form-card__title">New dosage schedule</h2>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="user-field__label">Supplement</label>
              <select
                className="form-select"
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
            </div>
            <div className="col-md-6">
              <label className="user-field__label">Start date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Enabled</th>
                  <th>Quantity</th>
                  <th>Meal timing</th>
                </tr>
              </thead>
              <tbody>
                {PERIOD_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={periods[row.key].enabled}
                        onChange={(e) => updatePeriod(row.key, { enabled: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        disabled={!periods[row.key].enabled}
                        value={periods[row.key].quantity}
                        onChange={(e) =>
                          updatePeriod(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="form-select"
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

          <div className="mb-3">
            <strong>Preview:</strong>{" "}
            {selectedSupplement
              ? `${totalPerDay} ${selectedSupplement.unit}/day · ${durationDays || 0} days · ${formatDate(startDate)} – ${formatDate(endDate)}`
              : "Select a supplement to preview duration"}
          </div>

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Create dosage schedule"}
          </button>
        </form>
      ) : null}

      <h2 className="form-card__title">Active & past schedules</h2>
      {dosages.length === 0 ? (
        <p className="text-muted">No dosage schedules yet.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {dosages.map((dosage) => (
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
    </div>
  );
}
