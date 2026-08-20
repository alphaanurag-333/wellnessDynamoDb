import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { PageHeader } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { fetchPendingTasks } from "../api/pendingApi.js";

const QUEUE_META = [
  {
    id: "counselling-reports",
    key: "counsellingReports",
    title: "Counselling & reports",
    subtitle: "Overdue counselling and blood reports waiting on analysis",
    icon: "♟",
    tone: "red",
    action: "Open client list",
    destination: UPDATED_ADMIN_PATHS.users,
    empty: "No overdue counselling or blood reports right now.",
  },
  {
    id: "meal-review",
    key: "mealReview",
    title: "Meal review",
    subtitle: "Photos your clients logged, waiting on your feedback",
    icon: "▣",
    tone: "purple",
    action: "Open client list",
    destination: UPDATED_ADMIN_PATHS.users,
    empty: "No meal photos waiting for review.",
  },
  {
    id: "orders",
    key: "orders",
    title: "Orders Pending",
    subtitle: "Supplement orders you have not placed yet, and placed orders not delivered",
    icon: "☆",
    tone: "orange",
    action: "Open Energy Exchange",
    destination: UPDATED_ADMIN_PATHS.users,
    empty: "No supplement orders waiting on you.",
  },
  {
    id: "meetings",
    key: "meetings",
    title: "Meetings this week",
    subtitle: "Confirmed slots on your calendar",
    icon: "▦",
    tone: "blue",
    action: "Open Calendar",
    destination: UPDATED_ADMIN_PATHS.calendar,
    empty: "No meetings scheduled this week.",
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
        {queue.items.length === 0 ? (
          <p className="pending-queue__empty">{queue.empty}</p>
        ) : (
          queue.items.map((item) => (
            <button
              key={`${queue.id}-${item.id || item.userId || item.name}`}
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
          ))
        )}
      </div>
    </section>
  );
}

export function PendingPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { viewAs, account, dataScope } = useViewAs();
  const noteKey = useMemo(
    () => `ua-pending-note:${account?.id || viewAs || "staff"}`,
    [account?.id, viewAs],
  );
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [taskQueues, setTaskQueues] = useState({
    counsellingReports: [],
    mealReview: [],
    orders: [],
    meetings: [],
  });

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

  useEffect(() => {
    let cancelled = false;
    async function loadTasks() {
      setLoading(true);
      setLoadError("");
      try {
        const queues = await fetchPendingTasks();
        if (cancelled) return;
        setTaskQueues(queues);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err?.message || "Couldn’t load pending tasks");
        setTaskQueues({
          counsellingReports: [],
          mealReview: [],
          orders: [],
          meetings: [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [account?.id, dataScope, viewAs]);

  useEffect(() => {
    if (loading) return;
    const focus = String(searchParams.get("focus") || "").trim();
    if (!focus) return;
    const sectionId = focus === "delivery" ? "orders" : focus;
    const node = document.querySelector(`[data-pending-section="${sectionId}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, searchParams]);

  const queues = useMemo(
    () => QUEUE_META.map((meta) => ({
      ...meta,
      items: taskQueues[meta.key] || [],
    })),
    [taskQueues],
  );

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

  function openItem(item) {
    if (!item?.userId) {
      showToast(`${item?.link || "Open"}: ${item?.name || "client"}`);
      return;
    }
    const section = item.section ? `?section=${encodeURIComponent(item.section)}` : "";
    navigate(`${UPDATED_ADMIN_PATHS.userDetail(item.userId)}${section}`);
  }

  return (
    <main className="content ua-page-enter pending-page">
      <PageHeader
        title="Pending Tasks"
        subtitle="Everything waiting on you, grouped by what it needs. Each list scrolls on its own."
      />

      {loadError ? (
        <div className="pending-page__status" role="alert">
          <strong>Couldn’t load pending tasks</strong>
          <p>{loadError}</p>
        </div>
      ) : null}

      <div className="pending-summary" aria-label="Pending task summary">
        {queues.map((queue) => (
          <button key={queue.id} type="button" onClick={() => document.querySelector(`[data-pending-section="${queue.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            {queue.title} · {loading ? "…" : queue.items.length}
          </button>
        ))}
      </div>

      {loading ? (
        <BrandLoader variant="page" label="Loading live client tasks…" />
      ) : (
        <div className="pending-queues">
          {queues.map((queue) => (
            <PendingQueue
              key={queue.id}
              queue={queue}
              onOpen={(selected) => navigate(selected.destination)}
              onItem={openItem}
            />
          ))}
        </div>
      )}

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
