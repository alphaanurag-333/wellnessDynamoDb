import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acceptHealConsultancyRequest,
  confirmHealConsultancyTime,
  createHealConsultancyTrack,
  fetchHealConsultancyTracks,
  offerHealConsultancyPeriods,
  rejectHealConsultancyIntake,
  rejectHealConsultancyRequest,
  updateHealConsultancyTrack,
} from "../../api/counsellingApi.js";
import {
  assignmentsFromPrescriptionPayload,
  coachMeetingsFromAssignments,
  listUserWellnessPrescriptions,
} from "../../api/wellnessPrescriptionAssignmentApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { mergeMeetingsWithOrphanTracks } from "../../utils/counsellingReviewHistory.js";
import { COUNSELLING_ACTIVITY_EVENT } from "../../utils/counsellingLiveRefresh.js";
import { useInbox } from "../../context/InboxContext.jsx";

const COUNSELLING_POLL_VISIBLE_MS = 3000;
const COUNSELLING_POLL_HIDDEN_MS = 12000;
const COUNSELLING_HISTORY_REFRESH_MS = 60_000;

function activeTrackSignature(track) {
  if (!track) return "";
  return [
    track.id,
    track.status,
    track.updatedAt || track.createdAt,
    track.scheduledAt || "",
  ].join("|");
}

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

function formatReviewDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

/** Scheduled column: e.g. 23 Oct 2026 08:30AM */
function formatReviewScheduledColumn(calendarDay, instant) {
  const day = String(calendarDay || "").trim();
  const iso = String(instant || "").trim();
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      const isDateOnlyPlaceholder =
        Boolean(day)
        && /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(iso)
        && iso.startsWith(day);
      if (!isDateOnlyPlaceholder) {
        const datePart = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const timePart = date
          .toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .replace(/\s/g, "");
        return `${datePart} ${timePart}`;
      }
    }
  }
  if (day) return formatReviewDay(day);
  return "—";
}

function reviewScheduleByLabel(meeting) {
  const role = String(meeting?.initiatedByRole || "").toLowerCase();
  return role === "client" ? "Client" : "You";
}

function reviewTrackingStatusLabel(meeting) {
  const session = String(meeting?.sessionStatus || "").toLowerCase();
  if (session === "complete") return "Completed";
  if (session === "cancel") return "Cancelled";
  if (session === "pending") {
    const trackStatus = String(meeting?.trackStatus || "").toLowerCase();
    if (trackStatus === "scheduled") return "Scheduled";
    return "Pending";
  }

  const reviewStatus = String(meeting?.reviewStatus || "").toLowerCase();
  const trackStatus = String(meeting?.trackStatus || "").toLowerCase();
  if (meeting?.cancelled || reviewStatus === "cancelled" || trackStatus === "cancelled") {
    return "Cancelled";
  }
  if (trackStatus === "completed" || trackStatus === "follow_up_needed") return "Completed";
  if (reviewStatus === "active" && (meeting?.completedAt || meeting?.completedDate)) {
    return "Completed";
  }
  if (trackStatus === "scheduled" && meeting?.scheduledAt) return "Scheduled";
  if (trackStatus && !["completed", "cancelled", "follow_up_needed"].includes(trackStatus)) {
    return "Pending";
  }
  return "Pending";
}

function reviewTrackingStatusClass(meeting) {
  const label = reviewTrackingStatusLabel(meeting).toLowerCase();
  if (label === "completed") return "completed";
  if (label === "cancelled") return "cancelled";
  if (label === "scheduled") return "scheduled";
  return "active";
}

function formatOffer(offer) {
  if (String(offer?.kind || "").toLowerCase() === "slot") {
    return `${offer.date} · ${offer.label || `${offer.startLocal || ""}–${offer.endLocal || ""}`}`;
  }
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
  const { loadInbox } = useInbox();
  const { canCreate, canEdit, canDelete } = useClientSectionPermissions("counselling");
  const canManage = canCreate || canEdit;
  const userId = String(user?.id || user?._id || "").trim();
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(Boolean(userId));
  const [activeTrack, setActiveTrack] = useState(null);
  const [scheduledTrack, setScheduledTrack] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [busy, setBusy] = useState(false);
  const [fixedTime, setFixedTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedRequestedSlotId, setSelectedRequestedSlotId] = useState("");
  const [pendingCancel, setPendingCancel] = useState(null);
  const [pendingRejectIntake, setPendingRejectIntake] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const loadInFlightRef = useRef(false);
  const activeTrackSigRef = useRef("");
  const lastHistoryRefreshRef = useRef(0);
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  async function loadReviewHistory(tracksList, coachMeetingsFromTracks) {
    if (Array.isArray(coachMeetingsFromTracks)) {
      return mergeMeetingsWithOrphanTracks(coachMeetingsFromTracks, tracksList);
    }
    try {
      const data = await listUserWellnessPrescriptions(userId);
      const fromApi = Array.isArray(data?.meetings) ? data.meetings : [];
      const prescriptionMeetings = fromApi.length
        ? fromApi
        : coachMeetingsFromAssignments(assignmentsFromPrescriptionPayload(data));
      return mergeMeetingsWithOrphanTracks(prescriptionMeetings, tracksList);
    } catch {
      return mergeMeetingsWithOrphanTracks([], tracksList);
    }
  }

  const load = useCallback(async (options = {}) => {
    if (!userId || loadInFlightRef.current) return;
    const silent = Boolean(options.silent);
    loadInFlightRef.current = true;
    if (!silent) {
      setLoading(true);
      setMeetingsLoading(true);
    }
    try {
      const data = await fetchHealConsultancyTracks(userId, { page: 1, limit: 30 });
      const tracksList = data.tracks || [];
      const nextActive = data.activeTrack || null;
      const nextSig = activeTrackSignature(nextActive);

      if (silent && nextSig && nextSig !== activeTrackSigRef.current && nextActive?.status === "requested") {
        onToastRef.current?.("Client requested a counselling session");
      }
      activeTrackSigRef.current = nextSig;

      setActiveTrack(nextActive);
      setScheduledTrack(data.scheduledTrack || null);
      const slots = nextActive?.requestedSlots || [];
      setSelectedRequestedSlotId(slots.length === 1 ? slots[0].id : "");

      const now = Date.now();
      const shouldRefreshHistory =
        !silent
        || !lastHistoryRefreshRef.current
        || now - lastHistoryRefreshRef.current >= COUNSELLING_HISTORY_REFRESH_MS;
      if (shouldRefreshHistory) {
        lastHistoryRefreshRef.current = now;
        setMeetings(await loadReviewHistory(tracksList, data.coachMeetings));
      }
    } catch (error) {
      if (!silent) {
        onToastRef.current?.(error.message || "Could not load counselling sessions");
        setMeetings([]);
      }
    } finally {
      loadInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
        setMeetingsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      activeTrackSigRef.current = "";
      lastHistoryRefreshRef.current = 0;
      setMeetings([]);
      setActiveTrack(null);
      setScheduledTrack(null);
      setLoading(false);
      setMeetingsLoading(false);
      return;
    }
    load();
    loadInbox({ silent: true });
  }, [userId, load, loadInbox]);

  useEffect(() => {
    if (!userId) return undefined;

    let intervalId = null;

    const tick = () => {
      load({ silent: true });
    };

    const reschedule = () => {
      if (intervalId) window.clearInterval(intervalId);
      const ms =
        typeof document !== "undefined" && document.visibilityState === "hidden"
          ? COUNSELLING_POLL_HIDDEN_MS
          : COUNSELLING_POLL_VISIBLE_MS;
      intervalId = window.setInterval(tick, ms);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
      reschedule();
    };

    const onFocus = () => tick();

    const onCounsellingActivity = (event) => {
      const subjectUserId = String(event.detail?.subjectUserId || "").trim();
      if (subjectUserId && subjectUserId === userId) {
        tick();
      }
    };

    reschedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(COUNSELLING_ACTIVITY_EVENT, onCounsellingActivity);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(COUNSELLING_ACTIVITY_EVENT, onCounsellingActivity);
    };
  }, [userId, load]);

  const selectedOffer = useMemo(() => {
    if (!activeTrack) return null;
    return (activeTrack.periodOffers || []).find((row) => row.id === activeTrack.selectedOfferId) || null;
  }, [activeTrack]);

  useEffect(() => {
    if (selectedOffer?.startLocal) setFixedTime(selectedOffer.startLocal);
  }, [selectedOffer?.id, selectedOffer?.startLocal]);

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

  async function sendCounsellingSlots(payload) {
    if (!canCreate) return;
    const slots = (payload?.slots || []).map((slot) => ({
      startAt: slot.startAt,
      endAt: slot.endAt,
    }));
    if (!slots.length) {
      onToast?.("Add at least one slot");
      return;
    }
    setBusy(true);
    try {
      const trackPayload = {
        slots,
        coachNotes: payload?.note || undefined,
        durationMinutes: payload?.duration,
      };
      if (activeTrack?.id && activeTrack.status === "requested") {
        await offerHealConsultancyPeriods(userId, activeTrack.id, trackPayload);
      } else if (!activeTrack) {
        await createHealConsultancyTrack(userId, trackPayload);
      } else {
        await offerHealConsultancyPeriods(userId, activeTrack.id, trackPayload);
      }
      setScheduleOpen(false);
      onToast?.("Counselling slots sent");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not send slots");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRejectIntake() {
    if (!activeTrack?.id) return;
    setPendingRejectIntake(false);
    setBusy(true);
    try {
      await rejectHealConsultancyIntake(userId, activeTrack.id);
      onToast?.("Counselling request rejected — client notified");
      await load();
    } catch (error) {
      onToast?.(error.message || "Could not reject request");
    } finally {
      setBusy(false);
    }
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
  const showClientIntake =
    canManage && activeTrack?.status === "requested";
  const requestedSlots = activeTrack?.requestedSlots || [];

  return (
    <div className="ua-cp-section ua-cp-counselling">
      <header className="ua-cp-counselling__head">
        <h2 className="ua-cp-placeholder__title">Counselling sessions</h2>
        <p className="ua-cp-placeholder__sub">
          Client requests a session, or you offer slots for them to pick. They pick a slot or ask for another time, then you confirm.
        </p>
      </header>

      {loading ? <p className="ua-cp-counselling__muted">Loading sessions…</p> : null}

      {!loading && !activeTrack && !scheduledSession ? (
        <div className="ua-cp-counselling__empty">
          <p className="ua-cp-counselling__empty-text">No open counselling request. History is listed below.</p>
          {canCreate ? (
            <div className="ua-cp-counselling__empty-cta">
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--launch-schedule"
                onClick={() => setScheduleOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 5h18v16H3z" />
                  <path d="M3 10h18" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                </svg>
                Schedule counselling meeting
              </button>
            </div>
          ) : null}
        </div>
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

          {activeTrack.concern && activeTrack.status !== "requested" ? (
            <p className="ua-cp-counselling__concern">{activeTrack.concern}</p>
          ) : null}

          {showClientIntake ? (
            <div className="ua-cp-counselling__block ua-cp-counselling__intake">
              <p className="ua-cp-counselling__intake-message">Client requested for Counselling sessions</p>
              <div className="ua-cp-counselling__actions">
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--green"
                  onClick={() => setScheduleOpen(true)}
                  disabled={busy}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--danger"
                  onClick={() => setPendingRejectIntake(true)}
                  disabled={busy}
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {activeTrack.status === "periods_offered" ? (
            <>
              {(activeTrack.periodOffers || []).some((row) => String(row.kind || "").toLowerCase() === "slot") ? (
                <div className="ua-cp-counselling__block">
                  <h3>Slots offered</h3>
                  <ul className="ua-cp-counselling__list">
                    {(activeTrack.periodOffers || []).map((offer) => (
                      <li key={offer.id || `${offer.date}-${offer.startLocal}`}>
                        <span>{formatOffer(offer)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="ua-cp-counselling__wait">Waiting for the client to pick a slot or request another time.</p>
            </>
          ) : null}

          {canManage && activeTrack.status === "time_requested" ? (
            <div className="ua-cp-counselling__block">
              <h3>Client requested times</h3>
              <p className="ua-cp-counselling__muted">
                Accept one of the times below, or reject to keep existing slot offers.
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

          {canDelete && activeTrack.status !== "scheduled" && activeTrack.status !== "requested" ? (
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
        <p className="ua-cp-counselling__muted">Same list the client sees as “When have I met my Wellness Coach?” Dates come from each Wellness Prescription.</p>
        {meetingsLoading ? (
          <p className="ua-cp-counselling__muted ua-cp-counselling__history-empty">Loading reviews…</p>
        ) : !meetings.length ? (
          <p className="ua-cp-counselling__muted ua-cp-counselling__history-empty">No reviews yet.</p>
        ) : (
          <div className="ua-cp-counselling__history-list">
            <div className="ua-cp-counselling__history-row ua-cp-counselling__history-row--head" aria-hidden="true">
              <span className="ua-cp-counselling__history-label">Review</span>
              <span className="ua-cp-counselling__history-col">Scheduled Date</span>
              <span className="ua-cp-counselling__history-col">Status</span>
              <span className="ua-cp-counselling__history-col">Schedule by</span>
            </div>
            {meetings.map((meeting, index) => {
              const reviewNumber = Math.max(meetings.length - index, 1);
              const statusClass = reviewTrackingStatusClass(meeting);
              return (
                <div key={meeting.id} className="ua-cp-counselling__history-row ua-cp-counselling__history-row--review">
                  <strong className="ua-cp-counselling__history-label">Review {reviewNumber}</strong>
                  <span className="ua-cp-counselling__history-date">
                    {formatReviewScheduledColumn(meeting.scheduledDate, meeting.scheduledAt)}
                  </span>
                  <span
                    className={`ua-cp-counselling__history-status ua-cp-counselling__history-status--${statusClass}`}
                  >
                    {reviewTrackingStatusLabel(meeting)}
                  </span>
                  <span className="ua-cp-counselling__history-date">
                    {reviewScheduleByLabel(meeting)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scheduleOpen ? (
        <ScheduleMeetingModal
          user={user}
          title="Schedule counselling meeting"
          defaultNote="Looking forward to our counselling session."
          showClientNote={false}
          defaultDuration={45}
          onClose={() => setScheduleOpen(false)}
          onSend={sendCounsellingSlots}
        />
      ) : null}

      <ConfirmDialog
        open={pendingRejectIntake}
        tag="Counselling"
        title="Reject counselling request?"
        body="The client will be notified that this request was declined."
        cancelLabel="Keep request"
        confirmLabel="Reject request"
        confirmTone="danger"
        onCancel={() => setPendingRejectIntake(false)}
        onConfirm={confirmRejectIntake}
      />

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
