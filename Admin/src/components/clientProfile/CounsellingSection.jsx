import { useEffect, useMemo, useState } from "react";
import {
  confirmHealConsultancyTime,
  fetchHealConsultancyTracks,
  offerHealConsultancyPeriods,
  updateHealConsultancyTrack,
} from "../../api/counsellingApi.js";

const PERIODS = [
  { key: "morning", label: "Morning", range: "08:00–12:00" },
  { key: "afternoon", label: "Afternoon", range: "12:00–16:00" },
  { key: "early_evening", label: "Early evening", range: "16:00–18:00" },
  { key: "evening", label: "Evening", range: "18:00–20:00" },
];

const STATUS_LABEL = {
  requested: "Requested",
  periods_offered: "Periods offered",
  period_selected: "Period selected",
  scheduled: "Scheduled",
  completed: "Completed",
  follow_up_needed: "Follow-up needed",
  cancelled: "Cancelled",
};

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOffer(offer) {
  const period = PERIODS.find((row) => row.key === offer.period);
  return `${offer.date} · ${offer.label || period?.label || offer.period} (${offer.startLocal || period?.range || ""}${offer.endLocal ? `–${offer.endLocal}` : ""})`;
}

function minutesToHm(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function hmToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function windowBounds(offer) {
  const period = PERIODS.find((row) => row.key === offer?.period);
  const [rangeStart, rangeEnd] = String(period?.range || "08:00–12:00").split("–");
  return {
    startMin: hmToMinutes(offer?.startLocal) ?? hmToMinutes(rangeStart) ?? 8 * 60,
    endMin: hmToMinutes(offer?.endLocal) ?? hmToMinutes(rangeEnd) ?? 12 * 60,
  };
}

export function CounsellingSection({ user, onToast }) {
  const userId = String(user?.id || user?._id || "").trim();
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [busy, setBusy] = useState(false);
  const [offerDate, setOfferDate] = useState("");
  const [offerPeriods, setOfferPeriods] = useState([]);
  const [pendingOffers, setPendingOffers] = useState([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [fixedTime, setFixedTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(45);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchHealConsultancyTracks(userId, { page: 1, limit: 30 });
      setTracks(data.tracks || []);
      setActiveTrack(data.activeTrack || null);
      setCoachNotes(data.activeTrack?.coachNotes || "");
    } catch (error) {
      onToast?.(error.message || "Could not load counselling sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const selectedOffer = useMemo(() => {
    if (!activeTrack) return null;
    return (activeTrack.periodOffers || []).find((row) => row.id === activeTrack.selectedOfferId) || null;
  }, [activeTrack]);

  useEffect(() => {
    if (selectedOffer?.startLocal) setFixedTime(selectedOffer.startLocal);
  }, [selectedOffer?.id, selectedOffer?.startLocal]);

  function addPendingOffer() {
    if (!offerDate || !offerPeriods.length) {
      onToast?.("Pick a date and at least one period");
      return;
    }
    const next = [...pendingOffers];
    for (const period of offerPeriods) {
      const key = `${offerDate}#${period}`;
      if (next.some((row) => `${row.date}#${row.period}` === key)) continue;
      next.push({ date: offerDate, period });
    }
    setPendingOffers(next);
    setOfferPeriods([]);
  }

  async function shareAvailability() {
    if (!activeTrack) return;
    const offers = pendingOffers.length
      ? pendingOffers
      : offerDate && offerPeriods.length
        ? offerPeriods.map((period) => ({ date: offerDate, period }))
        : [];
    if (!offers.length) {
      onToast?.("Add at least one date and period");
      return;
    }
    setBusy(true);
    try {
      const track = await offerHealConsultancyPeriods(userId, activeTrack.id, {
        offers,
        coachNotes,
      });
      setActiveTrack(track);
      setPendingOffers([]);
      onToast?.("Availability shared with client");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not share availability");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTime() {
    if (!activeTrack || !selectedOffer) return;
    const { startMin, endMin } = windowBounds(selectedOffer);
    const start = hmToMinutes(fixedTime);
    if (start == null || start < startMin || start + Number(durationMinutes) > endMin) {
      onToast?.("Fixed time must sit inside the selected period (including duration)");
      return;
    }
    const scheduledAt = `${selectedOffer.date}T${fixedTime}:00+05:30`;
    setBusy(true);
    try {
      const track = await confirmHealConsultancyTime(userId, activeTrack.id, {
        scheduledAt,
        durationMinutes: Number(durationMinutes) || 45,
      });
      setActiveTrack(track);
      onToast?.("Fixed time confirmed");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not confirm time");
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(status) {
    if (!activeTrack) return;
    setBusy(true);
    try {
      await updateHealConsultancyTrack(userId, activeTrack.id, { status });
      onToast?.(`Marked ${STATUS_LABEL[status] || status}`);
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not update session");
    } finally {
      setBusy(false);
    }
  }

  const bounds = selectedOffer ? windowBounds(selectedOffer) : null;

  return (
    <div className="ua-cp-section ua-cp-counselling">
      <h2 className="ua-cp-placeholder__title">Counselling sessions</h2>
      <p className="ua-cp-placeholder__sub">
        Client requests a session, you share date and period windows, they pick one, then you confirm a fixed time.
      </p>

      {loading ? <p className="ua-cp-counselling__muted">Loading sessions…</p> : null}

      {!loading && !activeTrack ? (
        <div className="ua-cp-counselling__empty">No open counselling request. History is listed below.</div>
      ) : null}

      {activeTrack ? (
        <div className="ua-cp-counselling__card">
          <div className="ua-cp-counselling__card-head">
            <span className={`ua-cp-counselling__status ua-cp-counselling__status--${activeTrack.status}`}>
              {STATUS_LABEL[activeTrack.status] || activeTrack.status}
            </span>
            <span className="ua-cp-counselling__muted">Requested {formatWhen(activeTrack.createdAt)}</span>
          </div>
          {activeTrack.concern ? <p className="ua-cp-counselling__concern">{activeTrack.concern}</p> : null}

          {activeTrack.status === "requested" || activeTrack.status === "periods_offered" ? (
            <div className="ua-cp-counselling__block">
              <h3>Share availability</h3>
              <div className="ua-cp-counselling__row">
                <label>
                  Date
                  <input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} />
                </label>
              </div>
              <div className="ua-cp-counselling__chips">
                {PERIODS.map((period) => {
                  const on = offerPeriods.includes(period.key);
                  return (
                    <button
                      key={period.key}
                      type="button"
                      className={`ua-cp-counselling__chip${on ? " is-on" : ""}`}
                      onClick={() => {
                        setOfferPeriods((prev) =>
                          prev.includes(period.key)
                            ? prev.filter((key) => key !== period.key)
                            : [...prev, period.key],
                        );
                      }}
                    >
                      {period.label}
                      <small>{period.range}</small>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={addPendingOffer} disabled={busy}>
                Add to list
              </button>
              {pendingOffers.length ? (
                <ul className="ua-cp-counselling__list">
                  {pendingOffers.map((row) => (
                    <li key={`${row.date}-${row.period}`}>
                      {formatOffer(row)}
                      <button
                        type="button"
                        className="ua-cp-counselling__remove"
                        onClick={() => setPendingOffers((prev) => prev.filter((item) => !(item.date === row.date && item.period === row.period)))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <label className="ua-cp-counselling__notes">
                Note to client (optional)
                <textarea rows={2} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} />
              </label>
              <button type="button" className="ua-cp-btn ua-cp-btn--primary" onClick={shareAvailability} disabled={busy}>
                {busy ? "Sharing…" : "Share with client"}
              </button>
            </div>
          ) : null}

          {activeTrack.status === "periods_offered" ? (
            <p className="ua-cp-counselling__muted">Waiting for the client to pick a period.</p>
          ) : null}

          {activeTrack.status === "period_selected" && selectedOffer ? (
            <div className="ua-cp-counselling__block">
              <h3>Confirm a fixed time</h3>
              <p className="ua-cp-counselling__muted">
                Client chose {formatOffer(selectedOffer)}. Times are IST.
              </p>
              <div className="ua-cp-counselling__row">
                <label>
                  Start time
                  <input
                    type="time"
                    value={fixedTime}
                    min={bounds ? minutesToHm(bounds.startMin) : undefined}
                    max={bounds ? minutesToHm(Math.max(bounds.startMin, bounds.endMin - Number(durationMinutes || 45))) : undefined}
                    onChange={(e) => setFixedTime(e.target.value)}
                  />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    min={15}
                    max={120}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </label>
              </div>
              <button type="button" className="ua-cp-btn ua-cp-btn--green" onClick={confirmTime} disabled={busy}>
                {busy ? "Confirming…" : "Confirm time & create Zoom"}
              </button>
            </div>
          ) : null}

          {activeTrack.status === "scheduled" ? (
            <div className="ua-cp-counselling__block">
              <h3>Scheduled</h3>
              <p>{formatWhen(activeTrack.scheduledAt)}</p>
              {activeTrack.zoomJoinUrl || activeTrack.meetingLink ? (
                <a className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" href={activeTrack.zoomStartUrl || activeTrack.zoomJoinUrl || activeTrack.meetingLink} target="_blank" rel="noreferrer">
                  Open Zoom
                </a>
              ) : null}
              <div className="ua-cp-counselling__actions">
                <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => patchStatus("completed")} disabled={busy}>
                  Mark completed
                </button>
                <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => patchStatus("cancelled")} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {activeTrack.status !== "scheduled" ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => patchStatus("cancelled")} disabled={busy}>
              Cancel request
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="ua-cp-counselling__history">
        <h3>History</h3>
        {!tracks.length ? <p className="ua-cp-counselling__muted">No sessions yet.</p> : null}
        <ul className="ua-cp-counselling__list">
          {tracks.map((track) => (
            <li key={track.id}>
              <strong>{STATUS_LABEL[track.status] || track.status}</strong>
              <span>{formatWhen(track.scheduledAt || track.createdAt)}</span>
              {track.concern ? <span>{track.concern}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
