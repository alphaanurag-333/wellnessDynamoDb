import { useCallback, useEffect, useState } from "react";
import {
  adminBulkUpdateAiEnable,
  adminListAiEnable,
  adminUpdateAiEnable,
} from "../api/aiEnableApi.js";
import { AI_ENABLE_PAGE_SIZE, aiEnabledCount } from "../data/aiEnableData.js";
import { ListPagination } from "./shared.jsx";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function AccessGroup({
  label,
  tone,
  people,
  busy,
  emptyLabel,
  onToggle,
  onEnableAll,
  onDisableAll,
  renderMeta,
}) {
  const [page, setPage] = useState(1);
  const enabledCount = aiEnabledCount(people);
  const pages = Math.max(1, Math.ceil(people.length / AI_ENABLE_PAGE_SIZE) || 1);
  const safePage = Math.min(page, pages);
  const visible = people.slice((safePage - 1) * AI_ENABLE_PAGE_SIZE, safePage * AI_ENABLE_PAGE_SIZE);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  return (
    <section className={`ua-cfg-ai-group is-${tone}`}>
      <div className="ua-cfg-ai-group__head">
        <div className="ua-cfg-ai-group__label-wrap">
          <span className="ua-cfg-ai-group__label">{label}</span>
          <span className="ua-cfg-ai-group__count">
            {enabledCount} of {people.length} enabled
          </span>
        </div>
        <div className="ua-cfg-ai-group__bulk">
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
            disabled={busy || !people.length || enabledCount === people.length}
            onClick={onEnableAll}
          >
            Enable all
          </button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
            disabled={busy || !people.length || enabledCount === 0}
            onClick={onDisableAll}
          >
            Disable all
          </button>
        </div>
      </div>

      {people.length ? (
        <div className="ua-cfg-ai-group__grid">
          {visible.map((person) => (
            <article key={person.id} className={`ua-cfg-ai-person${person.enabled ? " is-on" : ""}`}>
              <span
                className="ua-cfg-ai-person__avatar"
                style={{ backgroundColor: person.color }}
                aria-hidden="true"
              >
                {person.initials}
              </span>
              <div className="ua-cfg-ai-person__meta">
                <strong>{person.name}</strong>
                <span>{renderMeta(person)}</span>
              </div>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${person.enabled ? " ua-toggle--on" : ""}`}
                aria-pressed={person.enabled}
                aria-label={`${person.enabled ? "Disable" : "Enable"} AI for ${person.name}`}
                disabled={busy}
                onClick={() => onToggle(person)}
              >
                <span className="ua-toggle__knob" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="ua-cfg-panel__sub">{emptyLabel}</p>
      )}

      {people.length > AI_ENABLE_PAGE_SIZE ? (
        <ListPagination
          page={safePage}
          pages={pages}
          total={people.length}
          pageSize={AI_ENABLE_PAGE_SIZE}
          onPageChange={setPage}
          label={`${label} pagination`}
        />
      ) : null}
    </section>
  );
}

export function AiEnableSection({ coaches, setCoaches, assistants, setAssistants, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const coachEnabled = aiEnabledCount(coaches);
  const assistantEnabled = aiEnabledCount(assistants);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const { coaches: nextCoaches, assistants: nextAssistants } = await adminListAiEnable();
      setCoaches(nextCoaches);
      setAssistants(nextAssistants);
    } catch (error) {
      onToast(error?.message || "Failed to load AI access");
      setCoaches([]);
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setAssistants, setCoaches]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  async function togglePerson(person, group) {
    if (busy) return;
    const nextEnabled = !person.enabled;
    const setGroup = group === "coach" ? setCoaches : setAssistants;
    setBusy(true);
    setGroup((prev) => prev.map((entry) => (entry.id === person.id ? { ...entry, enabled: nextEnabled } : entry)));
    try {
      const saved = await adminUpdateAiEnable(null, person.id, nextEnabled);
      if (saved) {
        setGroup((prev) => prev.map((entry) => (entry.id === person.id ? { ...entry, ...saved } : entry)));
      }
      onToast(nextEnabled ? `AI enabled for ${person.name}` : `AI disabled for ${person.name}`);
    } catch (error) {
      setGroup((prev) => prev.map((entry) => (entry.id === person.id ? { ...entry, enabled: person.enabled } : entry)));
      onToast(error?.message || "Failed to update AI access");
    } finally {
      setBusy(false);
    }
  }

  async function bulkUpdate(group, enabled) {
    if (busy) return;
    const setGroup = group === "coach" ? setCoaches : setAssistants;
    const label = group === "coach" ? "coaches" : "assistants";
    setBusy(true);
    setGroup((prev) => prev.map((entry) => ({ ...entry, enabled })));
    try {
      await adminBulkUpdateAiEnable(null, group, enabled);
      onToast(enabled ? `All ${label} enabled` : `All ${label} disabled`);
    } catch (error) {
      onToast(error?.message || "Failed to update AI access");
      await loadPeople();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      className="ua-cfg-ai"
      title={(
        <span className="ua-cfg-ai__title">
          <span className="ua-cfg-ai__icon" aria-hidden="true">⚙</span>
          AI enable
        </span>
      )}
      subtitle={
        loading
          ? "Loading coach AI access…"
          : "AI report interpretation and summaries"
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching wellness coaches and assistants…</p>
      ) : (
        <>
          <div className="ua-cfg-ai__who">
            <h4 className="ua-cfg-ai__who-title">Who gets it</h4>
            <p className="ua-cfg-ai__who-sub">
              Admin always has access. Switch it on or off per person — off means the feature is hidden for that coach and their clients.
            </p>
          </div>

          <AccessGroup
            label="Wellness coach"
            tone="coach"
            people={coaches}
            busy={busy}
            emptyLabel="No active wellness coaches yet."
            onToggle={(person) => togglePerson(person, "coach")}
            onEnableAll={() => bulkUpdate("coach", true)}
            onDisableAll={() => bulkUpdate("coach", false)}
            renderMeta={(person) => person.role || "Wellness Coach"}
          />

          <AccessGroup
            label="Assistant WC"
            tone="assistant"
            people={assistants}
            busy={busy}
            emptyLabel="No active assistant coaches yet."
            onToggle={(person) => togglePerson(person, "assistant")}
            onEnableAll={() => bulkUpdate("assistant", true)}
            onDisableAll={() => bulkUpdate("assistant", false)}
            renderMeta={(person) => (person.reportsTo ? `under ${person.reportsTo}` : "unassigned")}
          />

          <p className="ua-cfg-ai__foot">
            {coachEnabled} of {coaches.length} coaches and {assistantEnabled} of {assistants.length} assistants have it.
          </p>
        </>
      )}
    </Panel>
  );
}
