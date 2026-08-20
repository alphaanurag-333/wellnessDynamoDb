import { useEffect, useMemo, useState } from "react";
import { fetchConsultancyClient } from "../../api/usersApi.js";
import { UNASSIGNED_COACH } from "../../data/usersData.js";

function initialsFromName(name) {
  const parts = String(name || "")
    .replace(/[—–]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part && !/^unassigned$/i.test(part));
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isUnassignedCoach(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (raw === UNASSIGNED_COACH) return true;
  const normalized = raw
    .replace(/[—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return !normalized || normalized === "unassigned";
}

function formatWhen(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function coachRoleLabel(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("admin")) return "Admin";
  if (t.includes("assistant")) return "Assistant WC";
  return "Personal Wellness Coach";
}

function isAdminRole(role) {
  return String(role || "").toLowerCase().includes("admin");
}

function resolveConsultationStatus(tx) {
  const raw = String(tx?.consultancyStatus || "").toLowerCase().trim();
  if (raw === "scheduled") return { key: "confirmed", label: "Confirmed" };
  if (raw === "completed") return { key: "completed", label: "Completed" };
  if (raw === "follow_up_needed") return { key: "follow-up", label: "Follow-up needed" };
  if (raw === "cancelled") return { key: "cancelled", label: "Cancelled" };

  const scheduledAt = String(tx?.sessionScheduledAt || "").trim();
  if (scheduledAt) {
    const date = new Date(scheduledAt);
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return { key: "confirmed", label: "Confirmed" };
    }
  }
  return { key: "completed", label: "Completed" };
}

function nextUpcomingLabel(transactions) {
  const now = Date.now();
  const upcoming = (Array.isArray(transactions) ? transactions : [])
    .filter((tx) => {
      const status = String(tx?.consultancyStatus || "").toLowerCase().trim();
      if (status === "cancelled") return false;
      const scheduledAt = String(tx?.sessionScheduledAt || "").trim();
      if (!scheduledAt) return false;
      const date = new Date(scheduledAt);
      return !Number.isNaN(date.getTime()) && date.getTime() > now;
    })
    .map((tx) => tx.sessionScheduledAt)
    .sort();
  return upcoming[0] ? formatWhen(upcoming[0]) : "";
}

function mapTransaction(tx) {
  const who = String(
    tx?.assigneeSnapshot?.name
      || tx?.meetingAssigneeName
      || tx?.coachName
      || "",
  ).trim();
  const role = coachRoleLabel(tx?.meetingAssigneeType || tx?.assigneeSnapshot?.role);
  const when = formatWhen(tx?.sessionScheduledAt || tx?.paidAt || tx?.createdAt);
  const mode = tx?.zoomMeetingLink ? "Video call" : "Consultation";
  const { key: statusKey, label: status } = resolveConsultationStatus(tx);
  const admin = isAdminRole(role);
  return {
    id: tx?.id || tx?._id || when,
    type: admin ? "Admin escalation" : "PWC consultation",
    who: who || "Admin desk",
    role,
    roleTone: admin ? "admin" : "pwc",
    mode,
    when: when || "Date not set",
    status,
    statusKey,
    avatarInit: initialsFromName(who || "Admin"),
  };
}

export function ConsultationSection({ user }) {
  const userId = String(user?.id || "").trim();
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [sessions, setSessions] = useState([]);
  const [nextLabel, setNextLabel] = useState("");

  const unassigned = isUnassignedCoach(user?.coach);
  const coachName = unassigned ? "Unassigned" : String(user?.coach || "").trim();
  const coachRole = user?.assignedCoachType === "assistant_wellness_coach"
    ? "Assistant Wellness Coach"
    : "Wellness Coach";
  const completedCount = sessions.filter((row) => row.statusKey === "completed").length;
  const coachSub = unassigned
    ? "No wellness coach assigned yet"
    : user?.awc
      ? `AWC · ${user.awc}`
      : coachRole;

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      setSessions([]);
      setNextLabel("");
      return undefined;
    }

    setLoading(true);
    fetchConsultancyClient(userId)
      .then((client) => {
        if (cancelled) return;
        const rows = Array.isArray(client?.consultancyTransactions)
          ? client.consultancyTransactions.map(mapTransaction)
          : [];
        setSessions(rows);
        setNextLabel(nextUpcomingLabel(client?.consultancyTransactions));
      })
      .catch(() => {
        if (cancelled) return;
        setSessions([]);
        setNextLabel("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const nextCopy = useMemo(() => {
    if (nextLabel) return nextLabel;
    if (!sessions.length) return "none scheduled";
    return "see history below";
  }, [nextLabel, sessions.length]);

  return (
    <div className="ua-cp-section ua-cp-consult">
      <h2 className="ua-cp-consult__title">Consultation</h2>

      <div className="ua-cp-consult__label">Assigned wellness coach</div>
      <div className={`ua-cp-consult__coach${unassigned ? " ua-cp-consult__coach--unassigned" : ""}`}>
        <div
          className={`ua-cp-consult__avatar${unassigned ? " ua-cp-consult__avatar--unassigned" : ""}`}
          aria-hidden="true"
        >
          {unassigned ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="8" r="3.25" />
              <path d="M5.5 18.5c1.6-3.1 4-4.6 6.5-4.6s4.9 1.5 6.5 4.6" strokeLinecap="round" />
            </svg>
          ) : (
            initialsFromName(coachName)
          )}
        </div>
        <div className="ua-cp-consult__coach-meta">
          <div className="ua-cp-consult__coach-name">{coachName}</div>
          <div className="ua-cp-consult__coach-spec">{coachSub}</div>
          {!unassigned ? (
            <div className="ua-cp-consult__coach-sessions">
              {completedCount} session{completedCount === 1 ? "" : "s"} completed
            </div>
          ) : null}
        </div>
        {unassigned ? (
          <span className="ua-cp-consult__status ua-cp-consult__status--unassigned">Not assigned</span>
        ) : null}
      </div>

      <div className="ua-cp-consult__label">PWC fixed consultations</div>
      <p className="ua-cp-consult__hint">
        Who each consultation was fixed with — a Personal Wellness Coach or the Admin desk. Next: {nextCopy}
      </p>

      {loading ? (
        <p className="ua-cp-consult__empty">Loading consultations…</p>
      ) : sessions.length ? (
        <div className="ua-cp-consult__list">
          {sessions.map((row) => (
            <div key={row.id} className="ua-cp-consult__row">
              <div
                className={`ua-cp-consult__avatar ua-cp-consult__avatar--sm ua-cp-consult__avatar--${row.roleTone}`}
                aria-hidden="true"
              >
                {row.avatarInit}
              </div>
              <div className="ua-cp-consult__row-body">
                <div className="ua-cp-consult__row-top">
                  <span className="ua-cp-consult__row-type">{row.type}</span>
                  <span className={`ua-cp-consult__role ua-cp-consult__role--${row.roleTone}`}>{row.role}</span>
                </div>
                <div className="ua-cp-consult__row-who">
                  Fixed with <b>{row.who}</b> · {row.mode}
                </div>
                <div className="ua-cp-consult__row-when">{row.when}</div>
              </div>
              <span className={`ua-cp-consult__status ua-cp-consult__status--${row.statusKey}`}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ua-cp-consult__empty">No PWC consultations recorded yet.</p>
      )}
    </div>
  );
}
