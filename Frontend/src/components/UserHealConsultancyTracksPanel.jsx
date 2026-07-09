import { Fragment, useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

const STATUS_OPTIONS = [
  { value: "requested", label: "Requested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "follow_up_needed", label: "Follow-up needed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label || value || "—";
}

function StatusBadge({ status }) {
  const value = String(status || "requested");
  return (
    <span className={`heal-consultancy-status heal-consultancy-status--${value}`}>
      {statusLabel(value)}
    </span>
  );
}

function emptyEditForm() {
  return {
    status: "requested",
    scheduledAt: "",
    meetingLink: "",
    coachNotes: "",
  };
}

function trackToEditForm(track) {
  if (!track) return emptyEditForm();
  return {
    status: track.status || "requested",
    scheduledAt: track.scheduledAt ? track.scheduledAt.slice(0, 16) : "",
    meetingLink: track.meetingLink || "",
    coachNotes: track.coachNotes || "",
  };
}

function truncateText(value, max = 80) {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function UserHealConsultancyTracksPanel({
  token,
  userId,
  api,
  readOnly = false,
  onUnauthorized,
}) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [tracks, setTracks] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyEditForm());

  const loadAll = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const result = await api.listTracks(token, userId, { page: 1, limit: 50 });
      setTracks(result?.tracks ?? []);
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to load consultancy tracks", "error");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const startEdit = (track) => {
    setEditingId(track.id || track._id);
    setEditForm(trackToEditForm(track));
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditForm(emptyEditForm());
  };

  const saveEdit = async (trackId) => {
    if (!api.updateTrack) return;
    setSavingId(trackId);
    try {
      await api.updateTrack(token, userId, trackId, {
        status: editForm.status,
        scheduledAt: editForm.scheduledAt || null,
        meetingLink: editForm.meetingLink || null,
        coachNotes: editForm.coachNotes || null,
      });
      Swal.fire("Saved", "Consultancy track updated", "success");
      cancelEdit();
      await loadAll();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to update consultancy track", "error");
    } finally {
      setSavingId("");
    }
  };

  if (loading) {
    return <p className="page-card__desc">Loading consultancy tracks…</p>;
  }

  return (
    <div className="user-heal-consultancy-panel">
      <div className="page-card">
        <h3 className="form-card__title">Consultancy tracks</h3>
        <p className="page-card__desc">
          Consultancy requests booked by this heal client. Update status, schedule, and notes below.
        </p>
      </div>

      <div className="page-card">
        {!tracks.length ? (
          <p className="page-card__desc">No consultancy requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table heal-consultancy-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Concern</th>
                  <th>Scheduled</th>
                  <th>Meeting</th>
                  <th>Notes</th>
                  {!readOnly && api.updateTrack ? <th className="data-table__actions-col">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => {
                  const trackId = track.id || track._id;
                  const isEditing = editingId === trackId;
                  const colSpan = readOnly || !api.updateTrack ? 6 : 7;

                  return (
                    <Fragment key={trackId}>
                      <tr>
                        <td>{formatDate(track.createdAt)}</td>
                        <td>
                          <StatusBadge status={track.status} />
                        </td>
                        <td>
                          <span className="data-table__cell-text" title={track.concern || ""}>
                            {truncateText(track.concern, 60)}
                          </span>
                        </td>
                        <td>{formatDate(track.scheduledAt)}</td>
                        <td>
                          {track.meetingLink ? (
                            <a href={track.meetingLink} target="_blank" rel="noreferrer">
                              Open link
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className="data-table__cell-text" title={track.coachNotes || ""}>
                            {truncateText(track.coachNotes, 40)}
                          </span>
                        </td>
                        {!readOnly && api.updateTrack ? (
                          <td className="data-table__actions-col">
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => (isEditing ? cancelEdit() : startEdit(track))}
                            >
                              {isEditing ? "Cancel" : "Manage"}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                      {isEditing ? (
                        <tr className="heal-consultancy-table__edit-row">
                          <td colSpan={colSpan}>
                            <div className="heal-consultancy-table__edit-form">
                              <div className="heal-consultancy-table__edit-grid">
                                <label className="user-field">
                                  <span className="user-field__label">Status</span>
                                  <select
                                    className="user-field__input"
                                    value={editForm.status}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, status: e.target.value }))
                                    }
                                  >
                                    {STATUS_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="user-field">
                                  <span className="user-field__label">Scheduled at</span>
                                  <input
                                    className="user-field__input"
                                    type="datetime-local"
                                    value={editForm.scheduledAt}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, scheduledAt: e.target.value }))
                                    }
                                  />
                                </label>
                                <label className="user-field">
                                  <span className="user-field__label">Meeting link</span>
                                  <input
                                    className="user-field__input"
                                    type="url"
                                    value={editForm.meetingLink}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, meetingLink: e.target.value }))
                                    }
                                    placeholder="https://"
                                  />
                                </label>
                              </div>
                              <label className="user-field">
                                <span className="user-field__label">Coach notes</span>
                                <textarea
                                  className="user-field__input"
                                  rows={3}
                                  value={editForm.coachNotes}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, coachNotes: e.target.value }))
                                  }
                                />
                              </label>
                              <div className="heal-consultancy-table__edit-actions">
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  disabled={savingId === trackId}
                                  onClick={() => saveEdit(trackId)}
                                >
                                  {savingId === trackId ? "Saving…" : "Save changes"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
