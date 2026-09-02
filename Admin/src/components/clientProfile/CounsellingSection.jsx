import { useEffect, useMemo, useState } from "react";
import {
  acceptHealConsultancyRequest,
  confirmHealConsultancyTime,
  fetchHealConsultancyTracks,
  offerHealConsultancyPeriods,
  rejectHealConsultancyRequest,
  updateHealConsultancyTrack,
} from "../../api/counsellingApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { MeetingDateSelector } from "./MeetingDateSelector.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import {
  formatDateKey,
  isBeforeCalendarDay,
  parseDateKey,
  startOfDay,
} from "./meetingDateUtils.js";

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
  time_requested: "Time requested",
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
  const { canCreate, canEdit, canDelete } = useClientSectionPermissions("counselling");
  const canManage = canCreate || canEdit;
  const userId = String(user?.id || user?._id || "").trim();
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [scheduledTrack, setScheduledTrack] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [busy, setBusy] = useState(false);
  const [offerDate, setOfferDate] = useState("");
  const [offerPeriods, setOfferPeriods] = useState([]);
  const [pendingOffers, setPendingOffers] = useState([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [fixedTime, setFixedTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedRequestedSlotId, setSelectedRequestedSlotId] = useState("");
  const [pendingCancel, setPendingCancel] = useState(null);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchHealConsultancyTracks(userId, { page: 1, limit: 30 });
      setTracks(data.tracks || []);
      setActiveTrack(data.activeTrack || null);
      setScheduledTrack(data.scheduledTrack || null);
      setCoachNotes(data.activeTrack?.coachNotes || "");
      const slots = data.activeTrack?.requestedSlots || [];
      setSelectedRequestedSlotId(slots.length === 1 ? slots[0].id : "");
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
    if (isPastOfferDate(offerDate)) {
      onToast?.("Choose today or a future date");
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
    if (offers.some((row) => isPastOfferDate(row.date))) {
      onToast?.("Choose today or a future date");
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
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      onToast?.("Choose a start time in the future");
      return;
    }
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

  async function acceptRequestedTime() {
    if (!activeTrack) return;
    const slots = activeTrack.requestedSlots || [];
    if (!slots.length) {
      onToast?.("No requested times on this session");
      return;
    }
    const requestedSlotId =
      selectedRequestedSlotId || (slots.length === 1 ? slots[0].id : "");
    if (!requestedSlotId) {
      onToast?.("Select which requested time to accept");
      return;
    }
    setBusy(true);
    try {
      const track = await acceptHealConsultancyRequest(userId, activeTrack.id, {
        requestedSlotId,
      });
      setActiveTrack(track);
      onToast?.("Requested time accepted");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not accept time request");
    } finally {
      setBusy(false);
    }
  }

  async function rejectRequestedTime() {
    if (!activeTrack) return;
    setBusy(true);
    try {
      const track = await rejectHealConsultancyRequest(userId, activeTrack.id);
      setActiveTrack(track);
      onToast?.("Time request rejected — periods remain available");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not reject time request");
    } finally {
      setBusy(false);
    }
  }

  async function patchTrackStatus(trackId, status) {
    if (!trackId) return;
    setBusy(true);
    try {
      await updateHealConsultancyTrack(userId, trackId, { status });
      onToast?.(`Marked ${STATUS_LABEL[status] || status}`);
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not update session");
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(status) {
    if (!activeTrack) return;
    await patchTrackStatus(activeTrack.id, status);
  }

  function askCancel(track, extras = {}) {
    if (!track?.id) return;
    setPendingCancel({
      id: track.id,
      kind: track.status === "scheduled" ? "session" : "request",
      label: extras.label || null,
    });
  }

  async function confirmCancel() {
    const trackId = pendingCancel?.id;
    if (!trackId) return;
    setPendingCancel(null);
    await patchTrackStatus(trackId, "cancelled");
  }

  const scheduledSession =
    scheduledTrack && scheduledTrack.id !== activeTrack?.id ? scheduledTrack : null;

  const bounds = selectedOffer ? windowBounds(selectedOffer) : null;
  const showShareBlock =
    canManage &&
    (activeTrack?.status === "requested" ||
      activeTrack?.status === "periods_offered" ||
      activeTrack?.status === "time_requested");
  const requestedSlots = activeTrack?.requestedSlots || [];
  const minOfferDate = useMemo(() => startOfDay(new Date()), []);
  const selectedOfferDate = useMemo(
    () => parseDateKey(offerDate) || minOfferDate,
    [offerDate, minOfferDate],
  );

  function isPastOfferDate(date) {
    if (!date) return false;
    const value = typeof date === "string" ? parseDateKey(date) : startOfDay(date);
    return value ? isBeforeCalendarDay(value, minOfferDate) : false;
  }

  return (
    <div className="ua-cp-section ua-cp-counselling">
      <header className="ua-cp-counselling__head">
        <h2 className="ua-cp-placeholder__title">Counselling sessions</h2>
        <p className="ua-cp-placeholder__sub">
          Client requests a session, you share date and period windows, they pick one or request another time, then you confirm.
        </p>
      </header>

      {loading ? <p className="ua-cp-counselling__muted">Loading sessions…</p> : null}

      {!loading && !activeTrack && !scheduledSession ? (
        <div className="ua-cp-counselling__empty">No open counselling request. History is listed below.</div>
      ) : null}

      {scheduledSession ? (
        <div style={{marginTop:"5px"}} className=" ua-cp-counselling__card ua-cp-counselling__card--scheduled">
          <div className="ua-cp-counselling__card-head">
            <span className="ua-cp-counselling__status ua-cp-counselling__status--scheduled">
              Scheduled session
            </span>
            <span className="ua-cp-counselling__muted">{formatWhen(scheduledSession.scheduledAt)}</span>
          </div>
          {scheduledSession.concern ? (
            <p className="ua-cp-counselling__concern">{scheduledSession.concern}</p>
          ) : null}
          <div className="ua-cp-counselling__block">
            <p className="ua-cp-counselling__scheduled-time">{formatWhen(scheduledSession.scheduledAt)}</p>
            {scheduledSession.zoomJoinUrl || scheduledSession.meetingLink ? (
              <a
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                href={scheduledSession.zoomStartUrl || scheduledSession.zoomJoinUrl || scheduledSession.meetingLink}
                target="_blank"
                rel="noreferrer"
              >
                Open meeting
              </a>
            ) : null}
            {canEdit || canDelete ? (
              <div className="ua-cp-counselling__actions">
                {canEdit ? (
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                    onClick={() => patchTrackStatus(scheduledSession.id, "completed")}
                    disabled={busy}
                  >
                    Mark completed
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                    onClick={() => askCancel(scheduledSession)}
                    disabled={busy}
                  >
                    Cancel session
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTrack ? (
        <div className="ua-cp-counselling__card">
          <div className="ua-cp-counselling__card-head">
            <span className={`ua-cp-counselling__status ua-cp-counselling__status--${activeTrack.status}`}>
              {STATUS_LABEL[activeTrack.status] || activeTrack.status}
            </span>
            <span className="ua-cp-counselling__muted">Requested {formatWhen(activeTrack.createdAt)}</span>
          </div>

          {activeTrack.concern ? (
            <p className="ua-cp-counselling__concern">{activeTrack.concern}</p>
          ) : null}

          {showShareBlock ? (
            <div className="ua-cp-counselling__block">
              <h3>Share availability</h3>
              <div className="ua-cp-counselling__row ua-cp-counselling__row--single">
                <MeetingDateSelector
                  value={selectedOfferDate}
                  onChange={(date) => setOfferDate(formatDateKey(date))}
                  minDate={minOfferDate}
                  onInvalidDate={(message) => onToast?.(message)}
                />
              </div>
              <p className="ua-cp-counselling__periods-label">Period windows</p>
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
              <div className="ua-cp-counselling__offer-actions">
                <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={addPendingOffer} disabled={busy}>
                  Add to list
                </button>
              </div>
              {pendingOffers.length ? (
                <ul className="ua-cp-counselling__list ua-cp-counselling__pending">
                  {pendingOffers.map((row) => (
                    <li key={`${row.date}-${row.period}`}>
                      <span>{formatOffer(row)}</span>
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
                <span className="ua-cp-counselling__field-label">Note to client (optional)</span>
                <textarea rows={3} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} />
              </label>
              <div className="ua-cp-counselling__cta">
                <button type="button" className="ua-cp-btn ua-cp-btn--primary" onClick={shareAvailability} disabled={busy}>
                  {busy ? "Sharing…" : "Share with client"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTrack.status === "periods_offered" ? (
            <p className="ua-cp-counselling__wait">Waiting for the client to pick a period or request another time.</p>
          ) : null}

          {canManage && activeTrack.status === "time_requested" ? (
            <div className="ua-cp-counselling__block">
              <h3>Client requested times</h3>
              <p className="ua-cp-counselling__muted">
                Accept one of the times below, reject to keep existing period offers, or share new availability above.
              </p>
              {!requestedSlots.length ? (
                <p className="ua-cp-counselling__muted">No requested slots found.</p>
              ) : (
                <ul className="ua-cp-counselling__list">
                  {requestedSlots.map((slot) => {
                    const selected = selectedRequestedSlotId === slot.id;
                    return (
                      <li key={slot.id}>
                        <label className="ua-cp-counselling__radio-row">
                          <input
                            type="radio"
                            name="requestedSlot"
                            checked={selected}
                            onChange={() => setSelectedRequestedSlotId(slot.id)}
                          />
                          <span>
                            {formatWhen(slot.startAt)}
                            {slot.endAt ? ` – ${formatWhen(slot.endAt)}` : ""}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="ua-cp-counselling__actions">
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--green"
                  onClick={acceptRequestedTime}
                  disabled={busy || !requestedSlots.length}
                >
                  {busy ? "Accepting…" : "Accept & confirm meeting"}
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline"
                  onClick={rejectRequestedTime}
                  disabled={busy}
                >
                  Reject request
                </button>
              </div>
            </div>
          ) : null}

          {canEdit && activeTrack.status === "period_selected" && selectedOffer ? (
            <div className="ua-cp-counselling__block">
              <h3>Confirm a fixed time</h3>
              <p className="ua-cp-counselling__muted">
                Client chose {formatOffer(selectedOffer)}. Times are IST.
              </p>
              <div className="ua-cp-counselling__row">
                <label>
                  <span className="ua-cp-counselling__field-label">Start time</span>
                  <input
                    type="time"
                    value={fixedTime}
                    min={bounds ? minutesToHm(bounds.startMin) : undefined}
                    max={bounds ? minutesToHm(Math.max(bounds.startMin, bounds.endMin - Number(durationMinutes || 45))) : undefined}
                    onChange={(e) => setFixedTime(e.target.value)}
                  />
                </label>
                <label>
                  <span className="ua-cp-counselling__field-label">Duration (minutes)</span>
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
              <div className="ua-cp-counselling__cta">
                <button type="button" className="ua-cp-btn ua-cp-btn--green" onClick={confirmTime} disabled={busy}>
                  {busy ? "Confirming…" : "Confirm time & create meeting"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTrack.status === "scheduled" ? (
            <div className="ua-cp-counselling__block">
              <h3>Scheduled</h3>
              <p className="ua-cp-counselling__scheduled-time">{formatWhen(activeTrack.scheduledAt)}</p>
              {activeTrack.zoomJoinUrl || activeTrack.meetingLink ? (
                <a className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" href={activeTrack.zoomStartUrl || activeTrack.zoomJoinUrl || activeTrack.meetingLink} target="_blank" rel="noreferrer">
                  Open meeting
                </a>
              ) : null}
              {canEdit || canDelete ? (
                <div className="ua-cp-counselling__actions">
                  {canEdit ? (
                    <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => patchStatus("completed")} disabled={busy}>
                      Mark completed
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => askCancel(activeTrack)} disabled={busy}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {canDelete && activeTrack.status !== "scheduled" ? (
            <div className="ua-cp-counselling__foot">
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-btn--danger" onClick={() => askCancel(activeTrack)} disabled={busy}>
                Cancel request
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="ua-cp-counselling__history">
        <h3>Review Tracking</h3>
        <p className="ua-cp-counselling__muted">Same list the client sees as “When have I met my Wellness Coach?”</p>
        {!tracks.length ? (
          <p className="ua-cp-counselling__muted ua-cp-counselling__history-empty">No sessions yet.</p>
        ) : (
          <div className="ua-cp-counselling__history-list">
            {[...tracks]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((track, index) => {
                const reviewNumber = Math.max(tracks.length - index, 1);
                const dateLabel = new Date(track.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <div key={track.id} className="ua-cp-counselling__history-row ua-cp-counselling__history-row--review">
                    <strong className="ua-cp-counselling__history-label">Review {reviewNumber}</strong>
                    <span className="ua-cp-counselling__history-date">{dateLabel}</span>
                    <span className={`ua-cp-counselling__history-status ua-cp-counselling__history-status--${track.status}`}>
                      {STATUS_LABEL[track.status] || track.status}
                    </span>
                    <div className="ua-cp-counselling__history-action">
                      {canDelete && track.status === "scheduled" && track.id !== scheduledSession?.id ? (
                        <button
                          type="button"
                          className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                          onClick={() => askCancel(track, { label: `Review ${reviewNumber}` })}
                          disabled={busy}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        tag="Counselling"
        title={
          pendingCancel?.kind === "session"
            ? `Cancel ${pendingCancel.label || "this session"}?`
            : `Cancel ${pendingCancel?.label || "this request"}?`
        }
        body={
          pendingCancel?.kind === "session"
            ? "This scheduled counselling session will be cancelled. The client will be notified."
            : "This counselling request will be cancelled. The client will be notified."
        }
        cancelLabel="Keep it"
        confirmLabel={pendingCancel?.kind === "session" ? "Cancel session" : "Cancel request"}
        confirmTone="danger"
        onCancel={() => setPendingCancel(null)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
