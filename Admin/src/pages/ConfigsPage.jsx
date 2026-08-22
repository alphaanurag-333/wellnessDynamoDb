import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { PageHeader, PillTabs } from "../components/shared.jsx";
import { CONFIG_GROUPS, CONFIG_TABS } from "../data/configsData.js";

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

const FEATURE_FLAGS_SOON_COPY =
  "Feature-flag management is not available yet.";

const GALLERY_SOON_COPY =
  "Gallery management is not available yet.";

export function ConfigsPage() {
  const navigate = useNavigate();
  const [comingSoonModal, setComingSoonModal] = useState(null);
  const [tab, setTab] = useState(() => {
    try {
      const saved = window.localStorage.getItem("admin.configs.activeTab");
      if (saved === "flags") return "app";
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
    if (nextTab === "flags") {
      setComingSoonModal({
        title: "Feature flags",
        copy: FEATURE_FLAGS_SOON_COPY,
      });
      return;
    }
    setTab(nextTab);
  }

  function handleManage(item) {
    if (item.comingSoon) {
      setComingSoonModal({
        title: item.name,
        copy: item.id === "app-gallery"
          ? GALLERY_SOON_COPY
          : `${item.name} is not available yet.`,
      });
      return;
    }
    navigate(`${UPDATED_ADMIN_PATHS.configs}/${item.id}`);
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
            {group.items.map((item) => (
              <div key={item.id} className="ua-config-item">
                <div className="ua-config-item__main">
                  <div className="ua-config-item__name">{item.name}</div>
                  <div className="ua-config-item__note">
                    {item.note} · {item.owner}
                  </div>
                </div>

                <button
                  type="button"
                  className="ua-config-manage"
                  onClick={() => handleManage(item)}
                >
                  Manage ›
                </button>
              </div>
            ))}
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
