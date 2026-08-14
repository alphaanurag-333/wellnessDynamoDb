import { useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  liveVersionText,
  surfaceVersionLabel,
  versionLiveLabel,
} from "../data/privacyConfigData.js";

function AssetSlot({ asset, onUpload, onRemove }) {
  const isPhoto = asset.kind === "photo";
  const label = isPhoto ? "Photo" : "Icon";

  return (
    <div className="ua-cfg-lb-asset">
      <span className={`ua-cfg-lb-asset__thumb${asset.uploaded ? ` is-${asset.tone}` : " is-empty"}`} aria-hidden="true">
        {asset.uploaded ? (isPhoto ? "🖼" : "◆") : "▢"}
      </span>
      <div className="ua-cfg-lb-asset__copy">
        <strong>
          {label}
          <span className={`ua-cfg-lb-asset__chip ua-cfg-lb-asset__chip--${asset.surface}`}>
            {asset.surface}
          </span>
        </strong>
        <span>{asset.uploaded ? `${asset.format} · ${asset.size}` : "Not uploaded"}</span>
      </div>
      {asset.uploaded ? (
        <>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={onUpload}>
            Replace
          </button>
          <button type="button" className="ua-cfg-icon-btn" aria-label={`Remove ${label}`} onClick={onRemove}>
            ×
          </button>
        </>
      ) : (
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={onUpload}>
          Upload
        </button>
      )}
    </div>
  );
}

function VersionHistoryModal({ block, onClose, onAssign, onSaveText }) {
  const [editingN, setEditingN] = useState(null);
  const [draft, setDraft] = useState("");

  if (!block) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-lb-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-lb-modal__head">
          <div>
            <h3 className="ua-cfg-lb-modal__title">
              <span aria-hidden="true">🕒</span> {block.title} · version history
            </h3>
            <p className="ua-cfg-lb-modal__sub">
              Web is on v{block.webVersion} · App is on v{block.appVersion} — assign any version to either surface
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ua-cfg-lb-versions">
          {block.versions.map((version) => {
            const live = versionLiveLabel(block, version.n);
            const isLive = live !== "NOT LIVE";
            const isEditing = editingN === version.n;
            const onWeb = block.webVersion === version.n;
            const onApp = block.appVersion === version.n;
            return (
              <article
                key={version.n}
                className={`ua-cfg-lb-version${isLive ? " is-live" : ""}`}
              >
                <div className="ua-cfg-lb-version__meta">
                  <strong>v{version.n}</strong>
                  <span>{version.date}</span>
                  <span>{version.author}</span>
                  <span className={`ua-cfg-lb-version__status${isLive ? " is-on" : ""}`}>{live}</span>
                </div>
                <div className="ua-cfg-lb-version__actions">
                  <button type="button" className={`ua-cfg-lb-assign ua-cfg-lb-assign--web${onWeb ? " is-on" : ""}`} onClick={() => onAssign(version.n, "web")}>
                    Web
                  </button>
                  <button type="button" className={`ua-cfg-lb-assign ua-cfg-lb-assign--app${onApp ? " is-on" : ""}`} onClick={() => onAssign(version.n, "app")}>
                    App
                  </button>
                  <button type="button" className={`ua-cfg-lb-assign ua-cfg-lb-assign--both${onWeb && onApp ? " is-on" : ""}`} onClick={() => onAssign(version.n, "both")}>
                    Both
                  </button>
                  {isEditing ? (
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                      onClick={() => {
                        const text = draft.trim();
                        if (!text) return;
                        onSaveText(version.n, text);
                        setEditingN(null);
                      }}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                      onClick={() => {
                        setEditingN(version.n);
                        setDraft(asCopyString(version.text));
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="ua-cfg-lb-version__body">
                  <span className={`ua-cfg-lb-version__badge${isLive ? " is-on" : ""}`}>
                    {isLive ? (live === "LIVE ON BOTH" ? "Web + App" : live.replace("LIVE ON ", "")) : "Draft"}
                  </span>
                  {isEditing ? (
                    <textarea
                      className="ua-cfg-lb-version__input"
                      rows={3}
                      value={asCopyString(draft)}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  ) : (
                    <p>{asCopyString(version.text)}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-lb-modal__close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function LegalBlocksSection({ blocks, setBlocks, onToast }) {
  const [historyId, setHistoryId] = useState(null);
  const historyBlock = blocks.find((entry) => entry.id === historyId) ?? null;

  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function updateAsset(id, key, uploaded) {
    setBlocks((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, assets: { ...entry.assets, [key]: { ...entry.assets[key], uploaded } } }
          : entry,
      ),
    );
  }

  return (
    <div className="ua-cfg-lb">
      {blocks.map((block) => (
        <section key={block.id} className="ua-cfg-lb-card">
          <div className="ua-cfg-lb-card__head">
            <h3 className="ua-cfg-lb-card__title">{block.title}</h3>
            <button
              type="button"
              className="ua-cfg-lb-card__versions"
              onClick={() => setHistoryId(block.id)}
            >
              Manage versions
            </button>
            <span className={`ua-cfg-faq__shown${block.shown ? " is-on" : ""}`}>
              {block.shown ? "Shown" : "Hidden"}
            </span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${block.shown ? " ua-toggle--on" : ""}`}
              aria-pressed={block.shown}
              aria-label={`${block.title} ${block.shown ? "shown" : "hidden"}`}
              onClick={() => updateBlock(block.id, { shown: !block.shown })}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>

          <div className="ua-cfg-lb-card__copy">
            <span className="ua-cfg-lb-card__tag">{surfaceVersionLabel(block)}</span>
            {block.webVersion === block.appVersion ? (
              <p>{liveVersionText(block)}</p>
            ) : (
              <p>
                <strong>Web · </strong>
                {liveVersionText(block, "web")}
                <br />
                <strong>App · </strong>
                {liveVersionText(block, "app")}
              </p>
            )}
          </div>

          <div className="ua-cfg-lb-assets">
            {Object.entries(block.assets).map(([key, asset]) => (
              <AssetSlot
                key={key}
                asset={asset}
                onUpload={() => {
                  updateAsset(block.id, key, true);
                  onToast(`${block.title} · ${asset.kind} attached`);
                }}
                onRemove={() => {
                  updateAsset(block.id, key, false);
                  onToast(`${block.title} · ${asset.kind} removed`);
                }}
              />
            ))}
          </div>
        </section>
      ))}

      {historyBlock ? (
        <VersionHistoryModal
          block={historyBlock}
          onClose={() => setHistoryId(null)}
          onAssign={(n, surface) => {
            const patch =
              surface === "both"
                ? { webVersion: n, appVersion: n }
                : surface === "web"
                  ? { webVersion: n }
                  : { appVersion: n };
            updateBlock(historyBlock.id, patch);
            onToast(`${historyBlock.title} · v${n} assigned to ${surface}`);
          }}
          onSaveText={(n, text) => {
            setBlocks((prev) =>
              prev.map((entry) =>
                entry.id === historyBlock.id
                  ? {
                      ...entry,
                      versions: entry.versions.map((version) =>
                        version.n === n ? { ...version, text: asCopyString(text) } : version,
                      ),
                    }
                  : entry,
              ),
            );
            onToast("Version saved");
          }}
        />
      ) : null}
    </div>
  );
}
