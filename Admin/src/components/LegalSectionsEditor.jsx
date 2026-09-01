import { useCallback, useEffect, useRef, useState } from "react";
import {
  contentFromLegalPage,
  getLegalPage,
  previewBlocksFromContent,
  saveLegalPage,
} from "../api/legalPageApi.js";
import { RichTextEditor } from "./RichTextEditor.jsx";

function isEmptyHtml(value) {
  return !String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snapshotPage(title, live, content) {
  return JSON.stringify({
    title: String(title || "").trim(),
    status: live ? "active" : "inactive",
    content: String(content || "").trim(),
  });
}

export function LegalSectionsEditor({
  slug,
  defaultTitle,
  sitePath,
  fallbackBlocks = [],
  setBlocks,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(defaultTitle);
  const [content, setContent] = useState("");
  const [live, setLive] = useState(true);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const savedSnapshotRef = useRef("");
  const stateRef = useRef({ pageTitle: defaultTitle, content: "", live: true });
  const onLocalChangeRef = useRef(onLocalChange);
  const onToastRef = useRef(onToast);
  const fallbackBlocksRef = useRef(fallbackBlocks);
  const setBlocksRef = useRef(setBlocks);

  onLocalChangeRef.current = onLocalChange;
  onToastRef.current = onToast;
  fallbackBlocksRef.current = fallbackBlocks;
  setBlocksRef.current = setBlocks;
  stateRef.current = { pageTitle, content, live };

  const applySavedPage = useCallback((page) => {
    const title = page.title || defaultTitle;
    const nextLive = page.status !== "inactive";
    const nextContent = contentFromLegalPage(page, fallbackBlocksRef.current);
    setPageTitle(title);
    setLive(nextLive);
    setContent(nextContent);
    setBlocksRef.current?.(previewBlocksFromContent(title, nextContent, nextLive));
    savedSnapshotRef.current = snapshotPage(title, nextLive, nextContent);
    setHasLocalChanges(false);
    onLocalChangeRef.current?.({ hasLocalChanges: false });
  }, [defaultTitle]);

  const applySavedPageRef = useRef(applySavedPage);
  applySavedPageRef.current = applySavedPage;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLegalPage(slug, fallbackBlocksRef.current)
      .then((page) => {
        if (!cancelled) applySavedPageRef.current(page);
      })
      .catch((error) => {
        if (cancelled) return;
        onToastRef.current?.(error?.message || `Failed to load ${defaultTitle.toLowerCase()}`);
        applySavedPageRef.current({
          title: defaultTitle,
          status: "active",
          content: "",
          blocks: fallbackBlocksRef.current,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultTitle, slug]);

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => {
      const { pageTitle: currentTitle, content: currentContent, live: currentLive } = stateRef.current;
      const title = String(currentTitle || "").trim() || defaultTitle;
      if (title.length < 3) {
        throw new Error("Title must be at least 3 characters");
      }
      if (isEmptyHtml(currentContent)) {
        throw new Error("Content is required");
      }
      const saved = await saveLegalPage(slug, {
        title,
        status: currentLive ? "active" : "inactive",
        content: currentContent,
      });
      applySavedPageRef.current(saved);
      return saved;
    });
  }, [defaultTitle, registerPublishHandler, slug]);

  function markDirty(nextTitle, nextLive, nextContent) {
    const dirty = snapshotPage(nextTitle, nextLive, nextContent) !== savedSnapshotRef.current;
    setHasLocalChanges(dirty);
    onLocalChangeRef.current?.({ hasLocalChanges: dirty });
  }

  const locked = loading;

  return (
    <div className="ua-cfg-privacy">
      {hasLocalChanges ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save, or refresh to discard.
        </p>
      ) : null}

      <section className="ua-cfg-panel">
        <div className="ua-cfg-panel__head">
          <div className="ua-cfg-panel__copy">
            <h3 className="ua-cfg-panel__title">{defaultTitle}</h3>
            <p className="ua-cfg-panel__sub">
              {loading
                ? `Loading ${defaultTitle.toLowerCase()}…`
                : `Title and content only. Preview for ${sitePath}. Publish to save.`}
            </p>
          </div>
          {loading ? null : (
            <div className="ua-cfg-panel__actions">
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
                  onClick={() => {
                    const nextLive = !live;
                    setLive(nextLive);
                    stateRef.current = { ...stateRef.current, live: nextLive };
                    markDirty(pageTitle, nextLive, stateRef.current.content);
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching {defaultTitle.toLowerCase()}…</p>
        ) : (
          <div className="ua-cfg-legal-page">
            <label className="ua-cfg-legal-edit__field ua-cfg-privacy__page-title">
              <span className="ua-cfg-legal-edit__label">Title</span>
              <input
                type="text"
                className="ua-cfg-faq-new__question"
                value={pageTitle}
                disabled={locked}
                onChange={(event) => {
                  const title = event.target.value;
                  setPageTitle(title);
                  stateRef.current = { ...stateRef.current, pageTitle: title };
                  markDirty(title, live, stateRef.current.content);
                }}
              />
            </label>
            <div className="ua-cfg-legal-edit__field ua-cfg-legal-page__content">
              <span className="ua-cfg-legal-edit__label">Content</span>
              <RichTextEditor
                key={`${slug}-content`}
                value={content}
                disabled={locked}
                placeholder="Write the page content…"
                onChange={(html) => {
                  setContent(html);
                  stateRef.current = { ...stateRef.current, content: html };
                  markDirty(stateRef.current.pageTitle, stateRef.current.live, html);
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
