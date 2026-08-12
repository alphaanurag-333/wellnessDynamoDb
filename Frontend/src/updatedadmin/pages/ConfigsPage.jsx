import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader, PillTabs } from "../components/shared.jsx";
import { CONFIG_GROUPS, CONFIG_TABS } from "../data/configsData.js";

export function ConfigsPage() {
  const { showToast: onToast } = useOutletContext();
  const [tab, setTab] = useState("common");
  const [toggles, setToggles] = useState(() => {
    const map = {};
    Object.values(CONFIG_GROUPS).flat().forEach((g) => {
      g.items.forEach((item) => {
        map[item.name] = item.on;
      });
    });
    return map;
  });

  const groups = CONFIG_GROUPS[tab] ?? [];

  function flipToggle(name) {
    setToggles((prev) => {
      const next = !prev[name];
      onToast(`${name} ${next ? "enabled" : "disabled"}`);
      return { ...prev, [name]: next };
    });
  }

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Configs"
        subtitle="Configuration groups scoped to the app, the web, or shared across both."
        autosave
        onAutosave={() => onToast("Saved")}
      />

      <div className="ua-config-toolbar">
        <PillTabs tabs={CONFIG_TABS} active={tab} onChange={setTab} />
        <span className="ua-config-toolbar__hint">Tap the App / Web chip on a row to enable it per surface</span>
      </div>

      {groups.map((group) => (
        <section key={group.name} className="ua-config-section">
          <div className="ua-config-section__head">{group.name}</div>
          <div className="ua-config-card">
            {group.items.map((item) => (
              <div key={item.name} className="ua-config-item">
                <div className="ua-config-item__main">
                  <div className="ua-config-item__title-row">
                    <span className="ua-config-item__name">{item.name}</span>
                    {item.app ? <span className="ua-surface-chip ua-surface-chip--app">App</span> : null}
                    {item.web ? <span className="ua-surface-chip ua-surface-chip--web">Web</span> : null}
                    {item.upload ? <span className="ua-config-upload-tag">Upload</span> : null}
                  </div>
                  <div className="ua-config-item__note">{item.note} · {item.owner}</div>
                </div>
                <div className="ua-config-item__controls">
                  {item.live ? <span className="ua-config-live">Live</span> : null}
                  <button
                    type="button"
                    className={`ua-toggle${toggles[item.name] ? " ua-toggle--on" : ""}`}
                    aria-pressed={toggles[item.name]}
                    onClick={() => flipToggle(item.name)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>
                <button type="button" className="ua-config-manage" onClick={() => onToast(`Manage ${item.name}`)}>
                  Manage ›
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
