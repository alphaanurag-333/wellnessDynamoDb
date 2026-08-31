import { useCallback, useEffect, useRef, useState } from "react";
import {
  blocksFromSections,
  getLegalPage,
  saveLegalPage,
  sectionsFromBlocks,
} from "../api/legalPageApi.js";
import { ABOUT_STATIC_PAGES } from "../data/aboutConfigData.js";
import { RichTextEditor } from "./RichTextEditor.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

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
      icon: String(loaded.icon || "").trim(),
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
    hasIcon: Boolean(page.hasIcon),
    fallbackBlocks: page.fallbackBlocks,
    title: title || page.defaultTitle,
    headline,
    live: loaded.status !== "inactive",
    body,
    icon: String(loaded.icon || "").trim(),
  };
}

function previewBlocksFromSections(sections) {
  return sections.map((section) => ({
    id: section.slug,
    title: section.title,
    shown: section.live,
    webVersion: 1,
    appVersion: 1,
    icon: section.icon || "",
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
    hasIcon: Boolean(page.hasIcon),
    fallbackBlocks: page.fallbackBlocks,
    title: page.defaultTitle,
    headline: page.defaultHeadline || "",
    live: true,
    body: compileSectionBody({ blocks: page.fallbackBlocks, title: page.defaultTitle }, page.defaultTitle),
    icon: "",
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

export function AboutSection({ setBlocks, onToast, registerPublishHandler, onLocalChange }) {
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState("");
  const [draft, setDraft] = useState({ title: "", headline: "", body: "" });
  const [sections, setSections] = useState(() => ABOUT_STATIC_PAGES.map(emptySection));
  const savedSnapshotRef = useRef("");
  const sectionsRef = useRef(sections);

  sectionsRef.current = sections;

  const syncPreview = useCallback((next) => {
    if (typeof setBlocks !== "function") return;
    setBlocks(previewBlocksFromSections(next));
  }, [setBlocks]);

  const snapshotSections = useCallback((rows) => JSON.stringify(
    rows.map((section) => ({
      slug: section.slug,
      title: section.title,
      headline: section.headline,
      live: section.live,
      body: section.body,
      icon: section.icon || "",
    })),
  ), []);

  const syncLocalDirty = useCallback((next) => {
    const dirty = snapshotSections(next) !== savedSnapshotRef.current;
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [onLocalChange, snapshotSections]);

  const applySavedSections = useCallback((next) => {
    setSections(next);
    syncPreview(next);
    savedSnapshotRef.current = snapshotSections(next);
    onLocalChange?.({ hasLocalChanges: false });
  }, [onLocalChange, snapshotSections, syncPreview]);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const pages = await Promise.all(
        ABOUT_STATIC_PAGES.map((page) => getLegalPage(page.slug, page.fallbackBlocks))
      );
      const next = ABOUT_STATIC_PAGES.map((page, index) => parseLoadedSection(page, pages[index] || {}));
      applySavedSections(next);
    } catch (error) {
      onToast(error?.message || "Failed to load about sections");
      applySavedSections(ABOUT_STATIC_PAGES.map(emptySection));
    } finally {
      setLoading(false);
    }
  }, [applySavedSections, onToast]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const applySavedSectionsRef = useRef(applySavedSections);
  applySavedSectionsRef.current = applySavedSections;

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => {
      const current = sectionsRef.current;
      const savedPages = await Promise.all(
        current.map((section) => saveLegalPage(section.slug, {
          title: section.title,
          status: section.live ? "active" : "inactive",
          blocks: saveBlocks(section),
          ...(section.hasIcon ? { icon: section.icon || "" } : {}),
        })),
      );
      const next = current.map((section, index) => ({
        ...parseLoadedSection(
          ABOUT_STATIC_PAGES.find((page) => page.slug === section.slug) || section,
          savedPages[index] || {},
        ),
        live: savedPages[index]?.status !== "inactive",
      }));
      applySavedSectionsRef.current(next);
      return savedPages;
    });
  }, [registerPublishHandler]);

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

  function applyLocal(section, patch, successMessage) {
    const nextSection = { ...section, ...patch };
    const next = sectionsRef.current.map((row) => (row.slug === section.slug ? nextSection : row));
    setSections(next);
    syncPreview(next);
    syncLocalDirty(next);
    if (successMessage) onToast(successMessage);
    return true;
  }

  const { openPicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose icon",
    cropImages: true,
    cropWidth: 391,
    cropHeight: 180,
    sizeHint: "Aspect 391 × 180 · exports at full image quality",
    onFiles: (_file, slug, assets) => {
      const url = String(assets?.[0]?.url || assets?.[0]?.file || "").trim();
      if (!slug || !url) {
        onToast("Could not attach icon");
        return;
      }
      const section = sectionsRef.current.find((row) => row.slug === slug);
      if (!section?.hasIcon) return;
      const nextSection = { ...section, icon: url };
      const next = sectionsRef.current.map((row) => (row.slug === slug ? nextSection : row));
      setSections(next);
      syncPreview(next);
      syncLocalDirty(next);
      onToast(`${section.label} icon attached`);
    },
    onError: (error) => onToast(error?.message || "Could not attach icon"),
  });

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
    const ok = applyLocal(section, { title, headline, body }, `${section.label} updated`);
    if (ok) cancelEdit();
  }

  function toggleLive(section) {
    applyLocal(
      section,
      { live: !section.live },
      `${section.label} ${section.live ? "hidden" : "is live"}`
    );
  }

  function clearIcon(section) {
    applyLocal(section, { icon: "" }, `${section.label} icon removed`);
  }

  const locked = loading;

  return (
    <div className="ua-cfg-privacy ua-cfg-about">
      <Panel
        title="Description, Vision, Mission, Goal"
        subtitle={
          loading
            ? "Loading about sections…"
            : "Title and description here are the same copy shown on irwellness.in/about-us. Upload icons for Vision, Mission and Goal. Toggle live to show or hide a block."
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
                {section.hasIcon ? (
                  <div className="ua-cfg-about-field ua-cfg-about-field--icon">
                    <span>Icon</span>
                    <div className="ua-cfg-about-icon">
                      <div className={`ua-cfg-about-icon__thumb${section.icon ? " is-filled" : ""}`}>
                        {section.icon ? (
                          <img src={section.icon} alt="" />
                        ) : (
                          <span aria-hidden="true">▢</span>
                        )}
                      </div>
                      <div className="ua-cfg-about-icon__meta">
                        <strong>{section.icon ? "Uploaded" : "Not uploaded"}</strong>
                        <span>Aspect 391 × 180 · keeps full upload quality</span>
                      </div>
                      <div className="ua-cfg-about-icon__actions">
                        <button
                          type="button"
                          className={`ua-cfg-btn ua-cfg-btn--sm${section.icon ? " ua-cfg-btn--ghost" : " ua-cfg-btn--primary"}`}
                          disabled={locked}
                          onClick={() => openPicker(section.slug)}
                        >
                          {section.icon ? "Replace" : "Upload"}
                        </button>
                        {section.icon ? (
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label={`Remove ${section.label} icon`}
                            disabled={locked}
                            onClick={() => clearIcon(section)}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
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

      {mediaPickerModal}
    </div>
  );
}
