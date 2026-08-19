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

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
        || section.id === "headline"
        || section.title === fallbackTitle
        || section.title === page?.title;
      if (sameTitle || /^\s*<h2\b/i.test(body)) return body;
      return body;
    })
    .filter(Boolean)
    .join("\n");
}

function splitFirstHeading(html) {
  const source = String(html || "").trim();
  const match = source.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
  if (!match) return { heading: "", intro: source, rest: "" };
  const heading = stripHtml(match[0]);
  const after = source.slice(source.indexOf(match[0]) + match[0].length);
  const nextAt = after.search(/<h2\b/i);
  if (nextAt < 0) return { heading, intro: after.trim(), rest: "" };
  return {
    heading,
    intro: after.slice(0, nextAt).trim(),
    rest: after.slice(nextAt).trim(),
  };
}

function parseLoadedSection(page, loaded) {
  const storedTitle = String(loaded.title || "").trim();
  const genericTitle = !storedTitle || /^about us$/i.test(storedTitle);
  if (genericTitle && !page.hasHeadline) {
    return {
      ...emptySection(page),
      live: loaded.status !== "inactive",
    };
  }
  const compiled = compileSectionBody(loaded, page.defaultTitle);
  const parts = splitFirstHeading(compiled);
  const headlineBlock = sectionsFromBlocks(loaded?.blocks).find((row) => row.id === "headline");
  const title = storedTitle || page.defaultTitle;
  let headline = page.hasHeadline
    ? (headlineBlock?.title || parts.heading || page.defaultHeadline || "")
    : "";
  let body = compiled;
  if (page.hasHeadline) {
    body = headlineBlock?.body || parts.intro || compiled;
  } else if (parts.heading && parts.heading.toLowerCase() === title.toLowerCase()) {
    body = [parts.intro, parts.rest].filter(Boolean).join("\n") || compiled;
  }
  if (!body && page.fallbackBlocks?.length) {
    body = compileSectionBody({ blocks: page.fallbackBlocks, title: page.defaultTitle }, page.defaultTitle);
  }
  return {
    slug: page.slug,
    label: page.label,
    defaultTitle: page.defaultTitle,
    defaultHeadline: page.defaultHeadline,
    hasHeadline: page.hasHeadline,
    fallbackBlocks: page.fallbackBlocks,
    title: title || page.defaultTitle,
    headline,
    live: loaded.status !== "inactive",
    body,
  };
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
        text: [section.headline, section.body].filter(Boolean).join("\n"),
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
    label: page.label,
    defaultTitle: page.defaultTitle,
    defaultHeadline: page.defaultHeadline,
    hasHeadline: page.hasHeadline,
    fallbackBlocks: page.fallbackBlocks,
    title: page.defaultTitle,
    headline: page.defaultHeadline || "",
    live: true,
    body: compileSectionBody({ blocks: page.fallbackBlocks, title: page.defaultTitle }, page.defaultTitle),
  };
}

function saveBlocks(section) {
  if (section.hasHeadline && String(section.headline || "").trim()) {
    return blocksFromSections([
      {
        id: "headline",
        title: section.headline.trim(),
        shown: true,
        body: section.body,
      },
    ]);
  }
  return blocksFromSections([
    {
      id: "intro",
      title: section.title,
      shown: true,
      body: section.body,
    },
  ]);
}

export function AboutSection({ setBlocks, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [draft, setDraft] = useState({ title: "", headline: "", body: "" });
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
      const next = ABOUT_STATIC_PAGES.map((page, index) => parseLoadedSection(page, pages[index] || {}));
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
    setDraft({ title: "", headline: "", body: "" });
  }

  function startEdit(section) {
    setEditingSlug(section.slug);
    setDraft({
      title: section.title,
      headline: section.headline || "",
      body: section.body,
    });
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
        blocks: saveBlocks(nextSection),
      });
      const resolved = {
        ...parseLoadedSection(
          ABOUT_STATIC_PAGES.find((page) => page.slug === section.slug) || section,
          saved,
        ),
        live: saved.status !== "inactive",
      };
      const resolvedList = next.map((row) => (row.slug === section.slug ? { ...nextSection, ...resolved } : row));
      setSections(resolvedList);
      syncPreview(resolvedList);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      setSections(previous);
      syncPreview(previous);
      onToast(error?.message || `Failed to save ${section.label.toLowerCase()}`);
      return false;
    } finally {
      setBusySlug("");
    }
  }

  async function saveEdit(section) {
    const title = draft.title.trim() || section.defaultTitle;
    const headline = section.hasHeadline ? draft.headline.trim() : "";
    const body = draft.body.trim();
    if (!title) {
      onToast("Title is required");
      return;
    }
    if (section.hasHeadline && !headline) {
      onToast("Headline is required");
      return;
    }
    if (isEmptyHtml(body)) {
      onToast("Description is required");
      return;
    }
    const ok = await persist(section, { title, headline, body }, `${section.label} saved`);
    if (ok) cancelEdit();
  }

  async function toggleLive(section) {
    if (busySlug) return;
    await persist(
      section,
      { live: !section.live },
      `${section.label} ${section.live ? "hidden" : "is live"}`
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
            : "Title and description here are the same copy shown on irwellness.in/about-us. Toggle live to show or hide a block."
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
                <h3 className="ua-cfg-lb-card__title">{section.label}</h3>
                <div className="ua-cfg-lb-card__actions">
                  <div className="ua-cfg-lb-card__shown">
                    <span className={`ua-cfg-faq__shown${section.live ? " is-on" : ""}`}>
                      {section.live ? "LIVE" : "HIDDEN"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${section.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={section.live}
                      aria-label={`${section.label} ${section.live ? "live" : "hidden"}`}
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
              <div className="ua-cfg-about-fields">
                <label className="ua-cfg-about-field">
                  <span>Title</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="ua-cfg-faq-new__question"
                      value={draft.title}
                      disabled={locked}
                      placeholder={section.defaultTitle}
                      onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  ) : (
                    <strong className="ua-cfg-about-field__value">{section.title || "—"}</strong>
                  )}
                </label>
                {section.hasHeadline ? (
                  <label className="ua-cfg-about-field">
                    <span>Headline</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="ua-cfg-faq-new__question"
                        value={draft.headline}
                        disabled={locked}
                        placeholder={section.defaultHeadline}
                        onChange={(event) => setDraft((prev) => ({ ...prev, headline: event.target.value }))}
                      />
                    ) : (
                      <strong className="ua-cfg-about-field__value">{section.headline || "—"}</strong>
                    )}
                  </label>
                ) : null}
                <div className="ua-cfg-about-field ua-cfg-about-field--body">
                  <span>Description</span>
                  {isEditing ? (
                    <RichTextEditor
                      key={`about-edit-${section.slug}`}
                      value={draft.body}
                      disabled={locked}
                      compact
                      placeholder={`Write the ${section.label.toLowerCase()} description…`}
                      onChange={(html) => setDraft((prev) => ({ ...prev, body: html }))}
                    />
                  ) : (
                    <SectionCopy text={section.body} />
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
