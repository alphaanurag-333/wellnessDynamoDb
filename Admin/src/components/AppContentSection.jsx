import { useCallback, useEffect, useState } from "react";
import { getAppContent, saveAppContent } from "../api/appContentApi.js";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

const EMPTY_CONTENT = {
  appName: "",
  appEmail: "",
  appMobile: "",
  address: "",
};

export function AppContentSection({ content, setContent, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(EMPTY_CONTENT);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppContent();
      const resolved = next || EMPTY_CONTENT;
      setContent(resolved);
      setSaved(resolved);
    } catch (error) {
      setContent(EMPTY_CONTENT);
      setSaved(EMPTY_CONTENT);
      onToast(error?.message || "Failed to load app content");
    } finally {
      setLoading(false);
    }
  }, [onToast, setContent]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  function patch(next) {
    setContent((prev) => ({ ...prev, ...next }));
  }

  async function persist() {
    const name = String(content?.appName || "").trim();
    const email = String(content?.appEmail || "").trim();
    const mobile = String(content?.appMobile || "").trim();
    if (!name || !email || !mobile) {
      onToast("App name, email, and mobile are required");
      return;
    }

    setBusy(true);
    try {
      const next = await saveAppContent(content);
      const resolved = next || EMPTY_CONTENT;
      setContent(resolved);
      setSaved(resolved);
      onToast("App content saved");
    } catch (error) {
      onToast(error?.message || "Failed to save app content");
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    String(content?.appName || "") !== String(saved.appName || "")
    || String(content?.appEmail || "") !== String(saved.appEmail || "")
    || String(content?.appMobile || "") !== String(saved.appMobile || "")
    || String(content?.address || "") !== String(saved.address || "");

  return (
    <Panel
      title="App content"
      subtitle={loading ? "Loading app content…" : "Manage brand and contact information backed by App Config."}
      actions={(
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--primary"
          disabled={loading || busy || !dirty}
          onClick={persist}
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      )}
    >
      <div className="ua-cfg-pgw-grid">
        <div className="ua-cfg-pgw-card ua-cfg-pgw-card--active">
          <div className="ua-cfg-pgw-card__head">
            <div>
              <div className="ua-cfg-pgw-card__name">Brand and contact details</div>
              <div className="ua-cfg-pgw-card__note">
                These values come from App Config and can be reused across website and admin surfaces.
              </div>
            </div>
          </div>

          <div className="ua-cfg-pgw-card__fields">
            <label className="ua-cfg-pgw-field">
              <span className="ua-cfg-pgw-field__label">App name *</span>
              <input
                className="ua-cfg-pgw-field__input"
                type="text"
                value={content?.appName || ""}
                disabled={loading || busy}
                placeholder="India Redefining Wellness"
                onChange={(event) => patch({ appName: event.target.value })}
              />
            </label>

            <label className="ua-cfg-pgw-field">
              <span className="ua-cfg-pgw-field__label">Email *</span>
              <input
                className="ua-cfg-pgw-field__input"
                type="email"
                value={content?.appEmail || ""}
                disabled={loading || busy}
                placeholder="info@example.com"
                onChange={(event) => patch({ appEmail: event.target.value })}
              />
            </label>

            <label className="ua-cfg-pgw-field">
              <span className="ua-cfg-pgw-field__label">Mobile *</span>
              <input
                className="ua-cfg-pgw-field__input"
                type="tel"
                value={content?.appMobile || ""}
                disabled={loading || busy}
                placeholder="9372109740"
                onChange={(event) => patch({ appMobile: event.target.value })}
              />
            </label>

            <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
              <span className="ua-cfg-pgw-field__label">Address</span>
              <textarea
                className="ua-cfg-tf-story"
                rows={5}
                value={content?.address || ""}
                disabled={loading || busy}
                placeholder="Registered office or support address"
                onChange={(event) => patch({ address: event.target.value })}
              />
            </label>
          </div>
        </div>
      </div>
    </Panel>
  );
}
