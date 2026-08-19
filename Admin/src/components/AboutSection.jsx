import { useCallback, useEffect, useState } from "react";
import {
  blocksFromSections,
  getLegalPage,
  saveLegalPage,
  sectionsFromBlocks,
} from "../api/legalPageApi.js";
import { ABOUT_STATIC_PAGES } from "../data/aboutConfigData.js";
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compileSectionBody(page, fallbackTitle) {
  const sections = sectionsFromBlocks(page?.blocks);
  if (!sections.length) return String(page?.content || "").trim();
  return sections
    .map((section) => {
      const body = String(section.body || "").trim();
      if (!body) return "";
      const sameTitle =
        section.id === "intro"
        || section.title === fallbackTitle
        || section.title === page?.title;
      if (sameTitle || /^\s*<h2\b/i.test(body)) return body;
      return `<h2>${escapeHtml(section.title)}</h2>\n${body}`;
    })
    .filter(Boolean)
    .join("\n");
}

function previewBlocksFromSections(sections) {
  return sections.map((section) => ({
    id: section.slug,
    title: section.title,
    shown: section.live,
    webVersion: 1,
    appVersion: 1,
    versions: [
      {
        n: 1,
        date: "",
        author: "Admin",
        text: section.body,
      },
    ],
  }));
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
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

function emptySection(page) {
  return {
    slug: page.slug,
    defaultTitle: page.defaultTitle,
    fallbackBlocks: page.fallbackBlocks,
    title: page.defaultTitle,
    live: true,
    body: "",
  };
}

export function AboutSection({ setBlocks, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [sections, setSections] = useState(() => ABOUT_STATIC_PAGES.map(emptySection));

  const syncPreview = useCallback((next) => {
    if (typeof setBlocks !== "function") return;
    setBlocks(previewBlocksFromSections(next));
  }, [setBlocks]);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const pages = await Promise.all(
        ABOUT_STATIC_PAGES.map((page) => getLegalPage(page.slug, page.fallbackBlocks))
      );
      const next = ABOUT_STATIC_PAGES.map((page, index) => {
        const loaded = pages[index] || {};
        return {
          ...emptySection(page),
          title: loaded.title || page.defaultTitle,
          live: loaded.status !== "inactive",
          body: compileSectionBody(loaded, page.defaultTitle),
        };
      });
      setSections(next);
      syncPreview(next);
    } catch (error) {
      onToast(error?.message || "Failed to load about sections");
      const fallback = ABOUT_STATIC_PAGES.map(emptySection);
      setSections(fallback);
      syncPreview(fallback);
    } finally {
      setLoading(false);
    }
  }, [onToast, syncPreview]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  function cancelEdit() {
    setEditingSlug("");
    setDraft({ title: "", body: "" });
  }

  function startEdit(section) {
    setEditingSlug(section.slug);
    setDraft({ title: section.title, body: section.body });
  }

  async function persist(section, patch, successMessage) {
    const nextSection = { ...section, ...patch };
    const previous = sections;
    const next = sections.map((row) => (row.slug === section.slug ? nextSection : row));
    setSections(next);
    syncPreview(next);
    setBusySlug(section.slug);
    try {
      const saved = await saveLegalPage(section.slug, {
        title: nextSection.title,
        status: nextSection.live ? "active" : "inactive",
        blocks: blocksFromSections([
          {
            id: "intro",
            title: nextSection.title,
            shown: true,
            body: nextSection.body,
          },
        ]),
      });
      const resolved = {
        ...nextSection,
        title: saved.title || nextSection.title,
        live: saved.status !== "inactive",
        body: compileSectionBody(saved, nextSection.defaultTitle) || nextSection.body,
      };
      const resolvedList = next.map((row) => (row.slug === section.slug ? resolved : row));
      setSections(resolvedList);
      syncPreview(resolvedList);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      setSections(previous);
      syncPreview(previous);
      onToast(error?.message || `Failed to save ${section.defaultTitle.toLowerCase()}`);
      return false;
    } finally {
      setBusySlug("");
    }
  }

  async function saveEdit(section) {
    const title = draft.title.trim() || section.defaultTitle;
    const body = draft.body.trim();
    if (!title) {
      onToast("Section title is required");
      return;
    }
    if (isEmptyHtml(body)) {
      onToast("Section copy is required");
      return;
    }
    const ok = await persist(section, { title, body }, `${title} saved`);
    if (ok) cancelEdit();
  }

  async function toggleLive(section) {
    if (busySlug) return;
    await persist(
      section,
      { live: !section.live },
      `${section.title} ${section.live ? "hidden" : "is live"}`
    );
  }

  const locked = loading || Boolean(busySlug);

  return (
    <div className="ua-cfg-privacy ua-cfg-about">
      <Panel
        title="Description, Vision, Mission, Goal"
        subtitle={
          loading
            ? "Loading about sections…"
            : "Each card is one section on irwellness.in/about-us. Toggle live to show or hide it. Saved to Static Pages."
        }
      />

      <div className="ua-cfg-lb">
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching about copy from Static Pages…</p>
        ) : null}
        {sections.map((section) => {
          const isEditing = editingSlug === section.slug;
          return (
            <section key={section.slug} className="ua-cfg-lb-card">
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
                    <span className={`ua-cfg-faq__shown${section.live ? " is-on" : ""}`}>
                      {section.live ? "LIVE" : "HIDDEN"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${section.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={section.live}
                      aria-label={`${section.title} ${section.live ? "live" : "hidden"}`}
                      disabled={locked}
                      onClick={() => toggleLive(section)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  <div className="ua-cfg-about-btns">
                    {isEditing ? (
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                        disabled={locked}
                        onClick={() => saveEdit(section)}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--ghost"
                        disabled={locked}
                        onClick={() => startEdit(section)}
                      >
                        Edit
                      </button>
                    )}
                    {isEditing ? (
                      <button
                        type="button"
                        className="ua-cfg-icon-btn"
                        aria-label="Cancel"
                        disabled={locked}
                        onClick={cancelEdit}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="ua-cfg-lb-card__copy">
                {isEditing ? (
                  <RichTextEditor
                    key={`about-edit-${section.slug}`}
                    value={draft.body}
                    disabled={locked}
                    compact
                    placeholder={`Write the ${section.defaultTitle.toLowerCase()} copy…`}
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
    </div>
  );
}
