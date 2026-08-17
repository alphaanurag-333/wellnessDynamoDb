import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

const QUEUES = [
  {
    id: "counselling-reports",
    title: "Counselling & reports",
    subtitle: "Overdue counselling and blood reports waiting on analysis",
    icon: "♟",
    tone: "red",
    action: "Open client list",
    destination: UPDATED_ADMIN_PATHS.users,
    items: [
      { name: "Madhupriya Bilas", initials: "MB", color: "#34a56a", tag: "COUNSELLING", detail: "Last session 16 days ago", link: "Schedule" },
      { name: "Ananya Rao", initials: "AR", color: "#5e6ad2", tag: "COUNSELLING", detail: "Last session 20 days ago", link: "Schedule" },
      { name: "Sana Iqbal", initials: "SI", color: "#0d9488", tag: "BLOOD REPORT", detail: "Analysis due this week", link: "Analyse" },
      { name: "Rohit Ambekar", initials: "RA", color: "#ec7a45", tag: "BLOOD REPORT", detail: "Report uploaded 2 days ago", link: "Analyse" },
    ],
  },
  {
    id: "meal-review",
    title: "Meal review",
    subtitle: "Photos your clients logged, waiting on your feedback",
    icon: "▣",
    tone: "purple",
    action: "Open client list",
    destination: UPDATED_ADMIN_PATHS.users,
    items: [
      { name: "Dipti Patil", initials: "DP", color: "#34a56a", tag: "MEAL PICS", detail: "2 photos · logged today", link: "Review" },
      { name: "Trisha Menon", initials: "TM", color: "#5e6ad2", tag: "MEAL PICS", detail: "3 photos · logged yesterday", link: "Review" },
    ],
  },
  {
    id: "orders",
    title: "Orders Pending",
    subtitle: "Supplement orders you have not placed yet, and placed orders not delivered",
    icon: "☆",
    tone: "orange",
    action: "Open Energy Exchange",
    destination: UPDATED_ADMIN_PATHS.users,
    items: [
      { name: "Madhupriya Bilas", initials: "MB", color: "#34a56a", tag: "NOT PLACED", detail: "Client asked you to order · 3 days ago", link: "Place order" },
      { name: "Ananya Rao", initials: "AR", color: "#5e6ad2", tag: "NOT PLACED", detail: "Client asked you to order · today", link: "Place order" },
      { name: "Sana Iqbal", initials: "SI", color: "#0d9488", tag: "NOT DELIVERED", detail: "Placed 8 Aug · ETA passed", link: "Update log" },
      { name: "Rohit Ambekar", initials: "RA", color: "#ec7a45", tag: "NOT DELIVERED", detail: "Placed 12 Aug · in transit", link: "Update log" },
    ],
  },
  {
    id: "meetings",
    title: "Meetings this week",
    subtitle: "Confirmed slots on your calendar",
    icon: "▦",
    tone: "blue",
    action: "Open Calendar",
    destination: UPDATED_ADMIN_PATHS.calendar,
    items: [
      { name: "Dipti Patil", initials: "DP", color: "#34a56a", tag: "TUE", detail: "Tue 11:00 · LAUNCH review", link: "Details" },
      { name: "Trisha Menon", initials: "TM", color: "#5e6ad2", tag: "WED", detail: "Wed 16:30 · Diet check-in", link: "Details" },
    ],
  },
];

function PendingQueue({ queue, onOpen, onItem }) {
  return (
    <section className={`pending-queue pending-queue--${queue.tone}`} data-pending-section={queue.id}>
      <header className="pending-queue__head">
        <span className="pending-queue__icon" aria-hidden="true">{queue.icon}</span>
        <div className="pending-queue__copy">
          <h2>{queue.title}</h2>
          <p>{queue.subtitle}</p>
        </div>
        <span className="pending-queue__count">{queue.items.length}</span>
        <button type="button" className="pending-queue__open" onClick={() => onOpen(queue)}>
          {queue.action} →
        </button>
      </header>
      <div className="pending-queue__items">
        {queue.items.map((item) => (
          <button
            key={`${queue.id}-${item.name}`}
            type="button"
            className="pending-task-card"
            onClick={() => onItem(item, queue)}
          >
            <span className="pending-task-card__top">
              <span className="pending-task-card__avatar" style={{ background: item.color }}>{item.initials}</span>
              <span className="pending-task-card__identity">
                <strong>{item.name}</strong>
                <span>{item.tag}</span>
              </span>
            </span>
            <span className="pending-task-card__detail">{item.detail}</span>
            <span className="pending-task-card__link">{item.link} →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PendingPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const { viewAs, account } = useViewAs();
  const noteKey = useMemo(
    () => `ua-pending-note:${account?.id || viewAs || "staff"}`,
    [account?.id, viewAs],
  );
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(noteKey) || "";
      setNote(stored);
      setSavedNote(stored);
    } catch {
      setNote("");
      setSavedNote("");
    }
    setLocked(true);
  }, [noteKey]);

  const dirty = note !== savedNote;

  function saveNote() {
    try {
      localStorage.setItem(noteKey, note);
    } catch {
      // The note still remains available for this session.
    }
    setSavedNote(note);
    setLocked(true);
    showToast("Note saved");
  }

  return (
    <main className="content ua-page-enter pending-page">
      <PageHeader
        title="Pending Tasks"
        subtitle="Everything waiting on you, grouped by what it needs. Each list scrolls on its own."
        autosave
        onAutosave={() => showToast("Saved")}
      />

      <div className="pending-summary" aria-label="Pending task summary">
        {QUEUES.map((queue) => (
          <button key={queue.id} type="button" onClick={() => document.querySelector(`[data-pending-section="${queue.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            {queue.title} · {queue.items.length}
          </button>
        ))}
      </div>

      <div className="pending-queues">
        {QUEUES.map((queue) => (
          <PendingQueue
            key={queue.id}
            queue={queue}
            onOpen={(selected) => navigate(selected.destination)}
            onItem={(item) => showToast(`${item.link}: ${item.name}`)}
          />
        ))}
      </div>

      <section className="pending-notes" data-pending-section="notes">
        <div className="pending-notes__head">
          <strong><span aria-hidden="true">📌</span> Notes to remember</strong>
          <div>
            <button type="button" onClick={() => setLocked((value) => !value)}>
              {locked ? "Locked" : "Editing"}
            </button>
            <button type="button" disabled={!dirty} onClick={() => setNote(savedNote)}>Reset</button>
            <button type="button" disabled={!dirty} onClick={saveNote}>{dirty ? "Save" : "Saved"}</button>
          </div>
        </div>
        <textarea
          value={note}
          readOnly={locked}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything to pick up later…"
          aria-label="Notes to remember"
        />
      </section>
    </main>
  );
}
