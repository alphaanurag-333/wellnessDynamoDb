import { LegalBlocksSection } from "./LegalBlocksSection.jsx";

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AboutSection({ editor, setEditor, blocks, setBlocks, onToast }) {
  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  return (
    <div className="ua-cfg-about">
      <Panel title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
        <div className="ua-cfg-bn-surfaces">
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn ? " is-on" : ""}`}>
            <span>App {editor.appOn ? "Enabled" : "Disabled"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${editor.appOn ? " ua-toggle--on" : ""}`}
              aria-pressed={editor.appOn}
              onClick={() => patch({ appOn: !editor.appOn })}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn ? " is-on" : ""}`}>
            <span>Web {editor.webOn ? "Enabled" : "Disabled"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${editor.webOn ? " ua-toggle--on" : ""}`}
              aria-pressed={editor.webOn}
              onClick={() => patch({ webOn: !editor.webOn })}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </Panel>

      <LegalBlocksSection blocks={blocks} setBlocks={setBlocks} onToast={onToast} />
    </div>
  );
}
