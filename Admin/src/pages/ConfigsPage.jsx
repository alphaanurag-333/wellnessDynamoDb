import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { PageHeader, PillTabs } from "../components/shared.jsx";
import { CONFIG_GROUPS, CONFIG_TABS } from "../data/configsData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";

function getModalRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

function ConfigComingSoonModal({ open, title, copy, onClose }) {
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
              {title}
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
          <p className="ua-configs-soon-modal__copy">{copy}</p>
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
  const { navSections } = useViewAs();
  const [comingSoonModal, setComingSoonModal] = useState(null);
  const [tab, setTab] = useState(() => {
    try {
      const saved = window.localStorage.getItem("admin.configs.activeTab");
      return CONFIG_TABS.some((entry) => entry.id === saved) ? saved : "app";
    } catch {
      return "app";
    }
  });
  const groups = CONFIG_GROUPS[tab] ?? [];

  useEffect(() => {
    try {
      window.localStorage.setItem("admin.configs.activeTab", tab);
    } catch {
      /* ignore storage issues */
    }
  }, [tab]);

  function handleTabChange(nextTab) {
    setTab(nextTab);
  }

  function handleManage(item) {
    if (item.comingSoon) {
      setComingSoonModal({
        title: item.name,
        copy: `${item.name} is not available yet.`,
      });
      return;
    }
    navigate(`${UPDATED_ADMIN_PATHS.configs}/${item.id}`);
  }

  if (!navSections.has("configs")) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  return (
    <main className="content ua-page-enter ua-configs-page">
      <PageHeader
        title="Configs"
        subtitle="Configuration groups scoped to the app, the web, or shared across both."
      />

      <div className="ua-config-toolbar">
        <PillTabs tabs={CONFIG_TABS} active={tab} onChange={handleTabChange} />
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

                  {tags.length > 0 ? (
                    <div className="ua-config-item__chips">
                      {tags.map((tag) => (
                        <span key={tag} className="ua-config-type-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="ua-config-manage"
                    onClick={() => handleManage(item)}
                  >
                    Manage ›
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <ConfigComingSoonModal
        open={Boolean(comingSoonModal)}
        title={comingSoonModal?.title ?? ""}
        copy={comingSoonModal?.copy ?? ""}
        onClose={() => setComingSoonModal(null)}
      />
    </main>
  );
}
