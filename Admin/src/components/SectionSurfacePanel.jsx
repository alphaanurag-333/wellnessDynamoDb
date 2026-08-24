import { useEffect, useState } from "react";
import {
  adminEnsureSectionSurfaceConfig,
  adminUpdateSectionSurfaceConfig,
} from "../api/sectionSurfaceConfigApi.js";
import { SectionSurfaceToggles } from "./SectionSurfaceToggles.jsx";
import "./sectionSurfaceLive.css";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel ua-cfg-surface-live">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Section-level App/Web enable pills (same pattern as Blogs).
 * When `editor`/`setEditor` are provided, state is lifted for preview/summary.
 */
export function SectionSurfacePanel({
  sectionId,
  editor,
  setEditor,
  onToast,
  title = "Where this is live",
  subtitle = "Turn it on for the app, the website, or both.",
  showApp = true,
  showWeb = true,
}) {
  const [local, setLocal] = useState({ appOn: true, webOn: true });
  const [busy, setBusy] = useState(false);
  const controlled = typeof setEditor === "function";
  const surface = controlled
    ? { appOn: editor?.appOn !== false, webOn: editor?.webOn !== false }
    : local;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await adminEnsureSectionSurfaceConfig(null, sectionId);
        if (cancelled) return;
        const next = {
          appOn: config?.appOn !== false,
          webOn: config?.webOn !== false,
        };
        if (controlled) {
          setEditor((prev) => ({ ...(prev || {}), ...next }));
        } else {
          setLocal(next);
        }
      } catch (error) {
        onToast?.(error?.message || "Could not load section settings");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [controlled, onToast, sectionId, setEditor]);

  async function patchConfig(next) {
    const prev = surface;
    const merged = { ...surface, ...next };
    if (controlled) {
      setEditor((cur) => ({ ...(cur || {}), ...merged }));
    } else {
      setLocal(merged);
    }
    setBusy(true);
    try {
      const saved = await adminUpdateSectionSurfaceConfig(null, sectionId, merged);
      const confirmed = {
        appOn: saved?.appOn !== false,
        webOn: saved?.webOn !== false,
      };
      if (controlled) {
        setEditor((cur) => ({ ...(cur || {}), ...confirmed }));
      } else {
        setLocal(confirmed);
      }
    } catch (error) {
      if (controlled) {
        setEditor((cur) => ({ ...(cur || {}), ...prev }));
      } else {
        setLocal(prev);
      }
      onToast?.(error?.message || "Could not save section settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={(
        <SectionSurfaceToggles
          appOn={surface.appOn}
          webOn={surface.webOn}
          busy={busy}
          onPatch={patchConfig}
          showApp={showApp}
          showWeb={showWeb}
        />
      )}
    />
  );
}
