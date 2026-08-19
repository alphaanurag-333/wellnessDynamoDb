import { useCallback, useEffect, useState } from "react";
import { getAppFooterText, saveAppFooterText, normalizeFooterText } from "../api/footerApi.js";
import { asCopyString } from "../data/bannerConfigData.js";

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

export function FooterSettingSection({ bottomLine, setBottomLine, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const loadFooter = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppFooterText();
      setBottomLine(next || "");
    } catch (error) {
      onToast(error?.message || "Failed to load footer text");
      setBottomLine("");
    } finally {
      setLoading(false);
    }
  }, [onToast, setBottomLine]);

  useEffect(() => {
    loadFooter();
  }, [loadFooter]);

  function startEdit() {
    setDraft(asCopyString(bottomLine));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(asCopyString(bottomLine));
    setEditing(false);
  }

  async function saveEdit() {
    const next = normalizeFooterText(draft);
    if (!next) {
      onToast("Footer text is required");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveAppFooterText(next);
      setBottomLine(saved);
      setEditing(false);
      onToast("Footer text saved");
    } catch (error) {
      onToast(error?.message || "Failed to save footer text");
    } finally {
      setBusy(false);
    }
  }

  const text = asCopyString(bottomLine);

  return (
    <div className="ua-cfg-ft">
      <Panel
        title="Bottom line"
        subtitle={
          loading
            ? "Loading footer text…"
            : "Copyright line shown on the website footer. Saved to App Config."
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching footer text from App Config…</p>
        ) : (
          <article className={`ua-cfg-sm-row${editing ? " is-editing" : ""}`}>
            <strong className="ua-cfg-sm-row__label">Copyright</strong>
            {editing ? (
              <input
                type="text"
                className="ua-cfg-sm-row__input"
                value={asCopyString(draft)}
                maxLength={100}
                disabled={busy}
                placeholder="© 2026 Company name. All rights reserved."
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveEdit();
                  if (event.key === "Escape") cancelEdit();
                }}
              />
            ) : (
              <span className="ua-cfg-sm-row__url">{text || "Not set"}</span>
            )}
            {editing ? (
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                disabled={busy}
                onClick={saveEdit}
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                className="ua-cfg-cr-link ua-cfg-cr-link--modify"
                disabled={busy}
                onClick={startEdit}
              >
                Edit
              </button>
            )}
          </article>
        )}
      </Panel>
    </div>
  );
}
