import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime12h(time24) {
  if (!time24) return "—";
  const [hStr, mStr] = String(time24).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "—";
  return days.map((d) => DAY_NAMES[d] || d).join(", ");
}

function emptyForm() {
  return {
    name: "",
    time: "08:00",
    days: [1, 2, 3, 4, 5],
    isActive: true,
  };
}

function ReminderFormModal({ open, initial, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name || "",
        time: initial.time || "08:00",
        days: Array.isArray(initial.days) ? [...initial.days] : [],
        isActive: initial.isActive !== false,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  if (!open) return null;

  const toggleDay = (day) => {
    setForm((prev) => {
      const has = prev.days.includes(day);
      const days = has ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort((a, b) => a - b);
      return { ...prev, days };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--wide">
        <h3 className="modal-card__title">{initial ? "Edit reminder" : "Add reminder"}</h3>
        <form className="reminder-form" onSubmit={handleSubmit}>
          <label className="user-field">
            <span className="user-field__label">Reminder name</span>
            <input
              className="user-field__input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Morning Supplement"
              required
              maxLength={120}
            />
          </label>

          <label className="user-field">
            <span className="user-field__label">Time</span>
            <input
              className="user-field__input"
              type="time"
              value={form.time}
              onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              required
            />
          </label>

          <div className="user-field">
            <span className="user-field__label">Repeat on</span>
            <div className="reminder-day-picker" role="group" aria-label="Select days">
              {DAY_LABELS.map((label, index) => {
                const selected = form.days.includes(index);
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    className={`reminder-day-picker__day${selected ? " reminder-day-picker__day--active" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleDay(index)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="user-field user-field--checkbox-row">
            <input
              type="checkbox"
              className="reminder-form__checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="user-field__label--row">Active</span>
          </label>

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || form.days.length === 0}>
              {saving ? "Saving…" : initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserRemindersPanel({
  title = "Client reminders",
  subtitle = "Schedule recurring reminders for this client.",
  backTo,
  backLabel = "Back to clients",
  token,
  userId,
  onUnauthorized,
  api,
  PageLoader,
  NotFoundPage,
}) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const sortedReminders = useMemo(
    () =>
      [...reminders].sort((a, b) => {
        const timeCmp = String(a.time || "").localeCompare(String(b.time || ""));
        if (timeCmp !== 0) return timeCmp;
        return String(a.name || "").localeCompare(String(b.name || ""));
      }),
    [reminders]
  );

  const loadReminders = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const { reminders: rows } = await api.list(token, userId);
      setReminders(rows || []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404 || e?.status === 403) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (reminder) => {
    setEditing(reminder);
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    if (!token || !userId) return;
    setSaving(true);
    try {
      if (editing) {
        const id = editing._id || editing.id;
        const { reminder } = await api.update(token, userId, id, form);
        setReminders((prev) => prev.map((r) => ((r._id || r.id) === id ? reminder : r)));
      } else {
        const { reminder } = await api.create(token, userId, form);
        setReminders((prev) => [reminder, ...prev]);
      }
      setModalOpen(false);
      setEditing(null);
      await Swal.fire({ icon: "success", title: editing ? "Reminder updated" : "Reminder created", timer: 1400 });
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message || "Could not save reminder." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (reminder) => {
    if (!token || !userId) return;
    const id = reminder._id || reminder.id;
    setActionId(id);
    try {
      const { reminder: updated } = await api.toggle(token, userId, id, !reminder.isActive);
      setReminders((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)));
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message || "Could not update reminder." });
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (reminder) => {
    if (!token || !userId) return;
    const id = reminder._id || reminder.id;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete reminder?",
      text: `"${reminder.name}" will be removed permanently.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    setActionId(id);
    try {
      await api.remove(token, userId, id);
      setReminders((prev) => prev.filter((r) => (r._id || r.id) !== id));
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200 });
    } catch (e) {
      if (e?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message || "Could not delete reminder." });
    } finally {
      setActionId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;

  if (loading && reminders.length === 0 && PageLoader) {
    return <PageLoader label="Loading reminders…" />;
  }

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        {backTo ? (
          <Link to={backTo} className="user-back-btn" aria-label={backLabel}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        ) : null}
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">{title}</h2>
          <p className="user-page__subtitle">{subtitle}</p>
        </div>
        <div className="user-page__toolbar-actions">
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Add reminder
          </button>
        </div>
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-card reminder-page">
      <div className="reminder-list">
        {sortedReminders.length === 0 ? (
          <p className="table-placeholder">No reminders yet. Create one for this client.</p>
        ) : (
          sortedReminders.map((reminder) => {
            const id = reminder._id || reminder.id;
            const busy = actionId === id;
            return (
              <article key={id} className={`reminder-card${reminder.isActive ? "" : " reminder-card--inactive"}`}>
                <div className="reminder-card__main">
                  <div className="reminder-card__title-row">
                    <h3 className="reminder-card__title">{reminder.name}</h3>
                    {reminder.isCoachAssigned ? (
                      <span className="badge badge--success">Coach assigned</span>
                    ) : null}
                  </div>
                  <p className="reminder-card__meta">
                    <span>{formatTime12h(reminder.time)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDays(reminder.days)}</span>
                  </p>
                </div>
                <div className="reminder-card__actions">
                  <label className="reminder-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(reminder.isActive)}
                      disabled={busy}
                      onChange={() => handleToggle(reminder)}
                    />
                    <span>{reminder.isActive ? "On" : "Off"}</span>
                  </label>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => openEdit(reminder)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => handleDelete(reminder)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
      </div>

      <ReminderFormModal
        open={modalOpen}
        initial={editing}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
