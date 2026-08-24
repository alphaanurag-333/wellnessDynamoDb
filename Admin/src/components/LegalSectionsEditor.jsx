import { useCallback, useEffect, useRef, useState } from "react";
import {
  blocksFromSections,
  getLegalPage,
  saveLegalPage,
  sectionsFromBlocks,
} from "../api/legalPageApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { RichTextEditor } from "./RichTextEditor.jsx";

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function isEmptyHtml(value) {
  return !String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SectionCopy({ text }) {
  const value = String(text || "").trim();
  if (!value) return <p className="ua-cfg-panel__sub">No copy yet.</p>;
  if (looksLikeHtml(value)) {
    return <div className="ua-cfg-privacy__html" dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <p>{value}</p>;
}

function snapshotPage(title, live, blocks) {
  return JSON.stringify({
    title: String(title || "").trim(),
    status: live ? "active" : "inactive",
    blocks: blocksFromSections(sectionsFromBlocks(blocks), blocks),
  });
}

export function LegalSectionsEditor({
  slug,
  defaultTitle,
  sitePath,
  noun = "section",
  fallbackBlocks = [],
  blocks,
  setBlocks,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(defaultTitle);
  const [savedTitle, setSavedTitle] = useState(defaultTitle);
  const [live, setLive] = useState(true);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const savedSnapshotRef = useRef("");
  const stateRef = useRef({ blocks, pageTitle: defaultTitle, live: true });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: "", body: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  stateRef.current = { blocks, pageTitle, live };

  const sections = sectionsFromBlocks(blocks);

  const syncLocalDirty = useCallback((nextTitle, nextLive, nextBlocks) => {
    const dirty = snapshotPage(nextTitle, nextLive, nextBlocks) !== savedSnapshotRef.current;
    setHasLocalChanges(dirty);
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [onLocalChange]);

  const applySavedPage = useCallback((page) => {
    const title = page.title || defaultTitle;
    const nextLive = page.status !== "inactive";
    const nextBlocks = page.blocks?.length ? page.blocks : fallbackBlocks.map((row) => ({ ...row }));
    setPageTitle(title);
    setSavedTitle(title);
    setLive(nextLive);
    setBlocks(nextBlocks);
    savedSnapshotRef.current = snapshotPage(title, nextLive, nextBlocks);
    setHasLocalChanges(false);
    onLocalChange?.({ hasLocalChanges: false });
  }, [defaultTitle, fallbackBlocks, onLocalChange, setBlocks]);

  const applySavedPageRef = useRef(applySavedPage);
  applySavedPageRef.current = applySavedPage;

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const page = await getLegalPage(slug, fallbackBlocks);
      applySavedPage(page);
    } catch (error) {
      onToast(error?.message || `Failed to load ${defaultTitle.toLowerCase()}`);
      applySavedPage({ title: defaultTitle, status: "active", blocks: fallbackBlocks });
    } finally {
      setLoading(false);
    }
  }, [applySavedPage, defaultTitle, fallbackBlocks, onToast, slug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => {
      const { blocks: currentBlocks, pageTitle: currentTitle, live: currentLive } = stateRef.current;
      const saved = await saveLegalPage(slug, {
        title: currentTitle,
        status: currentLive ? "active" : "inactive",
        blocks: currentBlocks,
      });
      applySavedPageRef.current(saved);
      return saved;
    });
  }, [registerPublishHandler, slug]);

  function applyLocal(nextSections, extra = {}) {
    const nextBlocks = blocksFromSections(nextSections, blocks);
    const nextTitle = extra.title ?? pageTitle;
    const nextLive = extra.live === false ? false : extra.live === true ? true : live;
    if (extra.title !== undefined) {
      setPageTitle(nextTitle);
      setSavedTitle(nextTitle);
    }
    if (extra.live !== undefined) setLive(nextLive);
    setBlocks(nextBlocks);
    syncLocalDirty(nextTitle, nextLive, nextBlocks);
    return true;
  }

  const locked = loading;

  function startEdit(section) {
    setShowAdd(false);
    setEditingId(section.id);
    setDraft({ title: section.title, body: section.body });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ title: "", body: "" });
  }

  async function saveEdit(id) {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title) {
      onToast("Section title is required");
      return;
    }
    if (isEmptyHtml(body)) {
      onToast("Section copy is required");
      return;
    }
    const ok = applyLocal(
      sections.map((row) => (row.id === id ? { ...row, title, body } : row))
    );
    if (ok) cancelEdit();
  }

  async function addSection() {
    const title = newDraft.title.trim();
    const body = newDraft.body.trim();
    if (!title) {
      onToast("Section title is required");
      return;
    }
    if (isEmptyHtml(body)) {
      onToast("Section copy is required");
      return;
    }
    const ok = applyLocal(
      [...sections, { id: `section-${Date.now()}`, title, body, shown: true }]
    );
    if (ok) {
      setNewDraft({ title: "", body: "" });
      setShowAdd(false);
    }
  }

  async function togglePageLive() {
    if (locked) return;
    const next = !live;
    setLive(next);
    applyLocal(sections, { live: next });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const section = pendingDelete;
    setPendingDelete(null);
    if (editingId === section.id) cancelEdit();
    applyLocal(sections.filter((row) => row.id !== section.id));
  }

  function moveSection(index, delta) {
    if (locked) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const copy = [...sections];
    const [row] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, row);
    applyLocal(copy, {}, "Section order updated");
  }

  return (
    <div className="ua-cfg-privacy">
      {hasLocalChanges ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save to the site, or refresh to discard.
        </p>
      ) : null}
      <Panel
        title={defaultTitle}
        subtitle={
          loading
            ? `Loading ${defaultTitle.toLowerCase()}…`
            : `Preview for ${sitePath}. Edits stay local until you publish.`
        }
        actions={
          loading ? null : (
            <>
              <div className="ua-cfg-privacy__live">
                <span className={`ua-cfg-faq__shown${live ? " is-on" : ""}`}>
                  {live ? "LIVE" : "HIDDEN"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${live ? " ua-toggle--on" : ""}`}
                  aria-pressed={live}
                  aria-label={`${defaultTitle} ${live ? "live" : "hidden"}`}
                  disabled={locked}
                  onClick={togglePageLive}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
              <button style={{color: "rgb(94, 106, 210)",
    border: "1px dashed rgb(203, 213, 230)"}}
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                disabled={locked}
                onClick={() => {
                  cancelEdit();
                  setShowAdd(true);
                }}
              >
                + Add sections
              </button>
            </>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching {defaultTitle.toLowerCase()} from Static Pages…</p>
        ) : (
          <label className="ua-cfg-legal-edit__field ua-cfg-privacy__page-title">
            <span className="ua-cfg-legal-edit__label">Page title</span>
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              value={pageTitle}
              disabled={locked}
              onChange={(event) => setPageTitle(event.target.value)}
              onBlur={() => {
                if (locked) return;
                const next = pageTitle.trim() || defaultTitle;
                setPageTitle(next);
                if (next === savedTitle) return;
                applyLocal(sections, { title: next }, "Page title updated");
              }}
            />
          </label>
        )}
      </Panel>

      {showAdd ? (
        <section className="ua-cfg-faq-new ua-cfg-privacy-add">
          <div className="ua-cfg-faq-new__head">
            <h4 className="ua-cfg-faq-new__title">New {noun}</h4>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              disabled={locked}
              onClick={() => {
                setShowAdd(false);
                setNewDraft({ title: "", body: "" });
              }}
            >
              ×
            </button>
          </div>
          <div className="ua-cfg-legal-edit">
            <label className="ua-cfg-legal-edit__field">
              <span className="ua-cfg-legal-edit__label">Heading</span>
              <input
                type="text"
                className="ua-cfg-faq-new__question"
                placeholder="e.g. Support hours"
                value={newDraft.title}
                disabled={locked}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>
            <label className="ua-cfg-legal-edit__field">
              <span className="ua-cfg-legal-edit__label">Copy</span>
              <RichTextEditor
                key={`${slug}-new-section`}
                value={newDraft.body}
                disabled={locked}
                compact
                placeholder="Write the section copy…"
                onChange={(html) => setNewDraft((prev) => ({ ...prev, body: html }))}
              />
            </label>
            <div className="ua-cfg-privacy-add__foot">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addSection}>
                Add section
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="ua-cfg-lb">
        {!loading && !sections.length ? (
          <p className="ua-cfg-panel__sub">No sections yet. Add a section to publish this page.</p>
        ) : null}
        {sections.map((section, index) => {
          const isEditing = editingId === section.id;
          return (
            <section key={section.id} className="ua-cfg-lb-card">
              <div className="ua-cfg-lb-card__head">
                {isEditing ? (
                  <input
                    type="text"
                    className="ua-cfg-faq-new__question"
                    value={draft.title}
                    disabled={locked}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  />
                ) : (
                  <h3 className="ua-cfg-lb-card__title">{section.title}</h3>
                )}
                <div className="ua-cfg-lb-card__actions">
                  <div className="ua-cfg-lb-card__shown">
                    <span className={`ua-cfg-faq__shown${section.shown ? " is-on" : ""}`}>
                      {section.shown ? "Shown" : "Hidden"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${section.shown ? " ua-toggle--on" : ""}`}
                      aria-pressed={section.shown}
                      aria-label={`${section.title} ${section.shown ? "shown" : "hidden"}`}
                      disabled={locked}
                      onClick={() => applyLocal(
                        sections.map((row) => (row.id === section.id ? { ...row, shown: !row.shown } : row))
                      )}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  {isEditing ? (
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                      disabled={locked}
                      onClick={() => saveEdit(section.id)}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                      disabled={locked}
                      onClick={() => startEdit(section)}
                    >
                      Edit
                    </button>
                  )}
                  <div className="ua-cfg-lb-card__moves">
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label="Move up"
                      disabled={locked || index === 0}
                      onClick={() => moveSection(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label="Move down"
                      disabled={locked || index === sections.length - 1}
                      onClick={() => moveSection(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                    aria-label={isEditing ? "Cancel" : `Remove ${section.title}`}
                    disabled={locked}
                    onClick={() => {
                      if (isEditing) {
                        cancelEdit();
                        return;
                      }
                      setPendingDelete(section);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="ua-cfg-lb-card__copy">
                {isEditing ? (
                  <RichTextEditor
                    key={`${slug}-edit-${section.id}`}
                    value={draft.body}
                    disabled={locked}
                    compact
                    placeholder="Write the section copy…"
                    onChange={(html) => setDraft((prev) => ({ ...prev, body: html }))}
                  />
                ) : (
                  <SectionCopy text={section.body} />
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag={`Delete ${noun}`}
        title={pendingDelete ? `Remove “${pendingDelete.title}”?` : ""}
        body="This section will be removed from your local edits. Publish to apply on the live site, or refresh to undo."
        cancelLabel="Keep section"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
