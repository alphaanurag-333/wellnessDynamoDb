import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

function buildSurfaceConfirm(field, nextValue) {
  const surface = field === "appOn" ? "app" : "website";
  const enabling = Boolean(nextValue);
  const surfaceLabel = surface === "app" ? "mobile app" : "website";

  return {
    tag: "Section visibility",
    title: enabling
      ? `Enable ${surface} for this section?`
      : `Disable ${surface} for this section?`,
    body: enabling
      ? `This section will be shown on the ${surfaceLabel}.`
      : `This entire section will be hidden on the ${surfaceLabel} until you turn it back on.`,
    confirmLabel: enabling ? "Enable" : "Disable",
    confirmTone: enabling ? "primary" : "danger",
  };
}

export function SectionSurfaceToggles({ appOn, webOn, busy, onPatch, showApp = true, showWeb = true }) {
  const [pending, setPending] = useState(null);

  function requestPatch(field) {
    const nextValue = field === "appOn" ? !appOn : !webOn;
    setPending({ field, nextValue, ...buildSurfaceConfirm(field, nextValue) });
  }

  function confirmPatch() {
    if (!pending) return;
    const { field, nextValue } = pending;
    setPending(null);
    onPatch({ [field]: nextValue });
  }

  return (
    <>
      <div className="ua-cfg-bn-surfaces">
        {showApp ? (
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${appOn ? " is-on" : ""}`}>
            <span>App {appOn ? "Enabled" : "Disabled"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${appOn ? " ua-toggle--on" : ""}`}
              aria-pressed={appOn}
              disabled={busy}
              onClick={() => requestPatch("appOn")}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        ) : null}
        {showWeb ? (
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${webOn ? " is-on" : ""}`}>
            <span>Web {webOn ? "Enabled" : "Disabled"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${webOn ? " ua-toggle--on" : ""}`}
              aria-pressed={webOn}
              disabled={busy}
              onClick={() => requestPatch("webOn")}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        tag={pending?.tag}
        title={pending?.title}
        body={pending?.body}
        confirmLabel={pending?.confirmLabel}
        confirmTone={pending?.confirmTone}
        onCancel={() => setPending(null)}
        onConfirm={confirmPatch}
      />
    </>
  );
}
