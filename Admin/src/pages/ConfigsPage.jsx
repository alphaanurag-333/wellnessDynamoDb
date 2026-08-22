import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { PageHeader, PillTabs } from "../components/shared.jsx";
import { CONFIG_GROUPS, CONFIG_TABS } from "../data/configsData.js";

function buildInitialState() {
  const toggles = {};
  const surfaces = {};
  Object.values(CONFIG_GROUPS)
    .flat()
    .forEach((g) => {
      g.items.forEach((item) => {
        toggles[item.id] = Boolean(item.on);
        surfaces[item.id] = {
          app: Boolean(item.app),
          web: Boolean(item.web),
        };
      });
    });
  return { toggles, surfaces };
}

function getModalRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

function FeatureFlagsComingSoonModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div className="ua-configs-soon-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-configs-soon-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="configs-soon-title"
      >
        <div className="ua-configs-soon-modal__head">
          <div className="ua-configs-soon-modal__titles">
            <h2 id="configs-soon-title" className="ua-configs-soon-modal__title">
              Feature flags
            </h2>
            <p className="ua-configs-soon-modal__eyebrow">Coming soon</p>
          </div>
          <button
            type="button"
            className="ua-configs-soon-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ua-configs-soon-modal__body">
          <p className="ua-configs-soon-modal__copy">
            Feature-flag management is not available yet. You will be able to roll out features by app, web, and audience from here.
          </p>
        </div>

        <div className="ua-configs-soon-modal__foot">
          <button type="button" className="ua-configs-soon-modal__btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, getModalRoot());
}

export function ConfigsPage() {
  const navigate = useNavigate();
  const { showToast: onToast } = useOutletContext();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [tab, setTab] = useState(() => {
    try {
      const saved = window.localStorage.getItem("admin.configs.activeTab");
      if (saved === "flags") return "app";
      return CONFIG_TABS.some((entry) => entry.id === saved) ? saved : "app";
    } catch {
      return "app";
    }
  });
  const [{ toggles, surfaces }, setState] = useState(buildInitialState);

  const groups = CONFIG_GROUPS[tab] ?? [];

  useEffect(() => {
    try {
      window.localStorage.setItem("admin.configs.activeTab", tab);
    } catch {
      /* ignore storage issues */
    }
  }, [tab]);

  function handleTabChange(nextTab) {
    if (nextTab === "flags") {
      setComingSoonOpen(true);
      return;
    }
    setTab(nextTab);
  }

  function flipToggle(item) {
    setState((prev) => {
      const next = !prev.toggles[item.id];
      onToast(`${item.name} ${next ? "enabled" : "disabled"}`);
      return {
        ...prev,
        toggles: { ...prev.toggles, [item.id]: next },
      };
    });
  }

  function flipSurface(item, surface) {
    setState((prev) => {
      const current = prev.surfaces[item.id] ?? { app: false, web: false };
      const nextVal = !current[surface];
      onToast(`${item.name} · ${surface === "app" ? "App" : "Web"} ${nextVal ? "enabled" : "disabled"}`);
      return {
        ...prev,
        surfaces: {
          ...prev.surfaces,
          [item.id]: { ...current, [surface]: nextVal },
        },
      };
    });
  }

  return (
    <main className="content ua-page-enter ua-configs-page">
      <PageHeader
        title="Configs"
        subtitle="Configuration groups scoped to the app, the web, or shared across both."
      />

      <div className="ua-config-toolbar">
        <PillTabs tabs={CONFIG_TABS} active={tab} onChange={handleTabChange} />
        <span className="ua-config-toolbar__hint">Tap the App / Web chip on a row to enable it per surface</span>
      </div>

      {groups.length === 0 ? (
        <div className="ua-cfg-empty">
          <div className="ua-cfg-empty__icon" aria-hidden="true">⚙️</div>
          <h2 className="ua-cfg-empty__title">No configs in this group yet</h2>
          <p className="ua-cfg-empty__sub">Switch to App, Web, or Common to manage live configuration groups.</p>
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.name} className="ua-config-section">
          <div className="ua-config-section__head">{group.name}</div>
          <div className="ua-config-card">
            {group.items.map((item) => {
              const on = Boolean(toggles[item.id]);
              const surf = surfaces[item.id] ?? { app: false, web: false };
              const showToggle = item.toggleable !== false;
              const isLive = showToggle ? on : Boolean(item.live);
              const showAppChip = surf.app || tab === "app" || tab === "common";
              const showWebChip = surf.web || tab === "web" || tab === "common";
              const tags = item.tags?.length
                ? item.tags
                : item.upload
                  ? ["Upload"]
                  : [];

              return (
                <div key={item.id} className="ua-config-item">
                  <div className="ua-config-item__main">
                    <div className="ua-config-item__name">{item.name}</div>
                    <div className="ua-config-item__note">
                      {item.note} · {item.owner}
                    </div>
                  </div>

                  <div className="ua-config-item__chips">
                    {showAppChip ? (
                      <button
                        type="button"
                        className={`ua-surface-chip ua-surface-chip--app${surf.app ? " is-on" : " is-off"}`}
                        aria-pressed={surf.app}
                        onClick={() => flipSurface(item, "app")}
                      >
                        App<span className="ua-surface-chip__dot" aria-hidden="true" />
                      </button>
                    ) : null}
                    {showWebChip ? (
                      <button
                        type="button"
                        className={`ua-surface-chip ua-surface-chip--web${surf.web ? " is-on" : " is-off"}`}
                        aria-pressed={surf.web}
                        onClick={() => flipSurface(item, "web")}
                      >
                        Web<span className="ua-surface-chip__dot" aria-hidden="true" />
                      </button>
                    ) : null}
                    {tags.map((tag) => (
                      <span key={tag} className="ua-config-type-tag">
                        {tag}
                      </span>
                    ))}
                    {showToggle ? (
                      <span className={`ua-config-status${isLive ? " ua-config-status--live" : " ua-config-status--hidden"}`}>
                        {isLive ? "LIVE" : "HIDDEN"}
                      </span>
                    ) : null}
                  </div>

                  <div className="ua-config-item__toggle-slot">
                    {showToggle ? (
                      <button
                        type="button"
                        className={`ua-toggle${on ? " ua-toggle--on" : ""}`}
                        aria-pressed={on}
                        aria-label={`${item.name} ${on ? "on" : "off"}`}
                        onClick={() => flipToggle(item)}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="ua-config-manage"
                    onClick={() => navigate(`${UPDATED_ADMIN_PATHS.configs}/${item.id}`)}
                  >
                    Manage ›
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <FeatureFlagsComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />
    </main>
  );
}
