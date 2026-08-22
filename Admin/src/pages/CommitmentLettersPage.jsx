import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { BackLink, OrangeButton } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  featuredMeta,
  formatFileSize,
  formatLetterDate,
  letterRowMeta,
  loadCoachLetterLibrary,
  nextLetterVersion,
  saveCoachLetterLibrary,
} from "../data/commitmentLettersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  getMyCoachContent,
  listMyContentCoaches,
  saveCoachLetterFile,
  saveCoachLetterLive,
  saveMyLetterFile,
  saveMyLetterLive,
  validateIntroCoverFile,
  validateLetterPdfFile,
} from "../api/coachContentApi.js";

function FileIcon({ live = false }) {
  return (
    <span className={`ua-commit__list-icon${live ? " is-live" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    </span>
  );
}

function PreviewPlaceholderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function SignaturePlaceholderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function openLetterUrl(url) {
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function downloadLetter(letter) {
  if (!letter?.fileUrl) return false;
  const a = document.createElement("a");
  a.href = letter.fileUrl;
  a.download = `${letter.name || "commitment-letter"}.pdf`;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

const COACH_VIEW_ROLES = new Set(["wc", "awc", "trainee"]);

export function CommitmentLettersPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const { account, isAdminView, sessionUi, viewAsPersona } = useViewAs();
  const { coachId: routeCoachId } = useParams();
  // Use signed-in session / persona — not a stale ua-view-as=admin from a prior login.
  const coachPersona = viewAsPersona || sessionUi;
  const isAdminLibrary = Boolean(isAdminView);
  const isCoachView = COACH_VIEW_ROLES.has(coachPersona);

  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const uploadRef = useRef(null);
  const replaceLiveRef = useRef(null);
  const previewRef = useRef(null);
  const signedCopyRef = useRef(null);
  const signatureRef = useRef(null);

  const ownId = account?.id;
  const coachId = isAdminLibrary ? (routeCoachId || coaches[0]?.id || ownId) : ownId;
  const activeCoach = coaches.find((row) => row.id === coachId) || null;
  const coachName = activeCoach?.name || account?.name || "Coach";
  const isOwnLetters = Boolean(ownId && coachId && ownId === coachId);
  const canEdit = isAdminLibrary || (isCoachView && isOwnLetters);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (isAdminLibrary) {
          const result = await listMyContentCoaches();
          if (cancelled) return;
          const rows = (result.coaches || []).map((coach) => ({
            id: coach.id,
            name: coach.name,
            letter: coach.items?.find((item) => item.kind === "letter") || null,
          }));
          setCoaches(rows);
        } else if (ownId) {
          const payload = await getMyCoachContent().catch(() => null);
          if (cancelled) return;
          const coachLetter = payload?.account?.coach_content?.letter || null;
          const mappedLetter = coachLetter
            ? {
                fileUrl: coachLetter.fileUrl || "",
                hasMedia: Boolean(coachLetter.fileUrl),
                signedAt: coachLetter.signedAt || "",
                live: Boolean(coachLetter.live),
                version: coachLetter.signedVersion || 1,
              }
            : null;
          setCoaches([
            {
              id: ownId,
              name: payload?.account?.name || account?.name || "Coach",
              letter: mappedLetter,
            },
          ]);
        } else {
          setCoaches([]);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err?.message || "Could not load coaches");
          setCoaches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [account?.name, isAdminLibrary, ownId, showToast]);

  useEffect(() => {
    if (!coachId) {
      setLibrary(null);
      return;
    }
    const coach = coaches.find((row) => row.id === coachId);
    const apiLetter = coach?.letter
      ? {
          fileUrl: coach.letter.fileUrl,
          signed: coach.letter.hasMedia,
          signedAt: coach.letter.signedAt,
          live: coach.letter.live,
          signedVersion: coach.letter.version,
        }
      : null;
    setLibrary(loadCoachLetterLibrary(coachId, coach?.name || coachName, apiLetter));
  }, [coachId, coachName, coaches]);

  useEffect(() => {
    if (!isAdminLibrary || loading || !coaches.length) return;
    const exists = coaches.some((row) => row.id === routeCoachId);
    if (!routeCoachId || !exists) {
      navigate(UPDATED_ADMIN_PATHS.commitmentLetters(coaches[0].id), { replace: true });
    }
  }, [coaches, isAdminLibrary, loading, navigate, routeCoachId]);

  const letters = useMemo(() => {
    if (!library) return [];
    return (library.letters || []).map((letter) => ({
      ...letter,
      live: letter.id === library.liveId,
    }));
  }, [library]);

  const featured = letters.find((letter) => letter.live) || null;
  const draft = letters.find((letter) => !letter.signed) || null;
  const signedCount = letters.filter((letter) => letter.signed).length;
  const hasSignatureImage = Boolean(library?.signature?.url);
  const signatureOnFile = hasSignatureImage || Boolean(library?.signature?.onFile) || signedCount > 0;
  const featuredPreviewSrc = featured?.previewUrl || featured?.fileUrl || "";
  const hasFeaturedPreview = Boolean(featuredPreviewSrc);
  const featuredPreviewIsImage = featured?.previewType === "image"
    || (Boolean(featured?.previewUrl) && featured?.previewType !== "pdf");
  const contentBackTo = isAdminLibrary || isCoachView ? UPDATED_ADMIN_PATHS.myContent : UPDATED_ADMIN_PATHS.dashboard;

  if (!isAdminLibrary && routeCoachId && ownId && routeCoachId !== ownId) {
    return <Navigate to={UPDATED_ADMIN_PATHS.commitmentLetters(ownId)} replace />;
  }

  if (!isAdminLibrary && !ownId) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  if (!isAdminLibrary && !isCoachView) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  function patchLibrary(updater) {
    setLibrary((prev) => {
      if (!prev) return prev;
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveCoachLetterLibrary(coachId, next);
      return next;
    });
  }

  async function syncLiveToApi(file) {
    if (!coachId || !file) return;
    try {
      setBusy(true);
      if (isOwnLetters) {
        await saveMyLetterFile(file);
        await saveMyLetterLive(true);
      } else {
        await saveCoachLetterFile(coachId, file);
        await saveCoachLetterLive(coachId, true);
      }
    } catch (err) {
      showToast(err?.message || "Saved locally — could not sync live letter to server");
    } finally {
      setBusy(false);
    }
  }

  function viewLetter(letter) {
    if (letter?.fileUrl && openLetterUrl(letter.fileUrl)) {
      showToast(`Opening ${letter.name}`);
      return;
    }
    showToast(`Opening ${letter?.name || "the letter"}`);
  }

  function downloadOne(letter) {
    if (!letter) {
      showToast("No letter to download");
      return;
    }
    if (letter.fileUrl && downloadLetter(letter)) {
      showToast(`Downloading ${letter.name} · ${letter.size}`);
      return;
    }
    showToast(`Downloading ${letter.name}${letter.size ? ` · ${letter.size}` : ""}`);
  }

  function requestSetLive(letter) {
    setConfirm({
      kind: "live",
      letter,
      tag: "COMMITMENT LETTER",
      title: `Make ${letter.name} the live one?`,
      body: "Clients see this version in the app from now on. The current live letter stays in the list.",
      confirmLabel: "Yes, set it live",
      confirmTone: "primary",
    });
  }

  function requestDelete(letter) {
    setConfirm({
      kind: "delete",
      letter,
      tag: "DELETE",
      title: `Delete ${letter.name}?`,
      body: "It disappears from this list for good. The live letter is untouched.",
      confirmLabel: "Yes, delete it",
      confirmTone: "danger",
    });
  }

  function requestSign(letter) {
    setConfirm({
      kind: "sign",
      letter,
      tag: "SIGNATURE",
      title: `Sign ${letter.name} with your saved signature?`,
      body: "Your signature on file is placed on the signature line and today's date is stamped beside it. You can still download the signed copy afterwards.",
      confirmLabel: "Yes, sign it",
      confirmTone: "primary",
    });
  }

  async function handleConfirm() {
    if (!confirm || !library) return;
    const { kind, letter } = confirm;
    setConfirm(null);

    if (kind === "live") {
      patchLibrary((prev) => ({ ...prev, liveId: letter.id }));
      if (letter.fileUrl) {
        try {
          setBusy(true);
          if (isOwnLetters) await saveMyLetterLive(true);
          else await saveCoachLetterLive(coachId, true);
        } catch (err) {
          showToast(err?.message || "Live letter updated locally");
        } finally {
          setBusy(false);
        }
      }
      showToast(`${letter.name} is live for ${coachName.split(" ")[0]}`);
      return;
    }

    if (kind === "delete") {
      patchLibrary((prev) => ({
        ...prev,
        letters: prev.letters.filter((row) => row.id !== letter.id),
        liveId: prev.liveId === letter.id ? null : prev.liveId,
      }));
      showToast(`${letter.name} deleted`);
      return;
    }

    if (kind === "sign") {
      const today = formatLetterDate(new Date());
      patchLibrary((prev) => ({
        ...prev,
        letters: prev.letters.map((row) =>
          row.id === letter.id
            ? {
                ...row,
                signed: true,
                date: today,
                name: `Commitment letter ${row.ver}`,
                by: coachName,
              }
            : row,
        ),
        signature: {
          ...prev.signature,
          name: coachName,
          onFile: true,
          drawnOn: prev.signature?.drawnOn || today,
        },
      }));
      showToast(`${letter.name} signed · set it live when you're ready`);
    }
  }

  function startUpload(mode) {
    if (!canEdit) return;
    if (mode === "replace-live") replaceLiveRef.current?.click();
    else if (mode === "preview") previewRef.current?.click();
    else if (mode === "signed-copy") signedCopyRef.current?.click();
    else if (mode === "signature") signatureRef.current?.click();
    else uploadRef.current?.click();
  }

  function isImageFile(file) {
    return String(file?.type || "").toLowerCase().startsWith("image/");
  }

  function isPdfFile(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    return type === "application/pdf" || name.endsWith(".pdf");
  }

  function onPreviewSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !library || !featured) return;
    if (!isPdfFile(file) && !isImageFile(file)) {
      showToast("Upload a PDF or image for the letter preview");
      return;
    }
    if (isPdfFile(file)) {
      const invalid = validateLetterPdfFile(file);
      if (invalid) {
        showToast(invalid);
        return;
      }
    } else {
      const invalid = validateIntroCoverFile(file);
      if (invalid) {
        showToast(invalid);
        return;
      }
    }
    const objectUrl = URL.createObjectURL(file);
    const today = formatLetterDate(new Date());
    const previewType = isImageFile(file) ? "image" : "pdf";
    patchLibrary((prev) => ({
      ...prev,
      letters: prev.letters.map((row) =>
        row.id === featured.id
          ? {
              ...row,
              previewUrl: objectUrl,
              previewType,
              fileUrl: previewType === "pdf" ? objectUrl : row.fileUrl || objectUrl,
              size: formatFileSize(file.size),
              date: row.date || today,
            }
          : row,
      ),
    }));
    if (previewType === "pdf") {
      syncLiveToApi(file);
    }
    showToast(featured.previewUrl || featured.fileUrl ? "Letter preview replaced" : "Letter preview uploaded");
  }

  function onNewLetterSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !library) return;
    const invalid = validateLetterPdfFile(file);
    if (invalid) {
      showToast(invalid);
      return;
    }
    const verNum = nextLetterVersion(library.letters);
    const ver = `v${verNum}`;
    const row = {
      id: `u-${Date.now()}`,
      name: `Commitment letter ${ver} (draft)`,
      ver,
      date: formatLetterDate(new Date()),
      size: formatFileSize(file.size),
      signed: false,
      live: false,
      by: coachName,
      fileUrl: URL.createObjectURL(file),
    };
    patchLibrary((prev) => ({
      ...prev,
      letters: [row, ...prev.letters],
    }));
    showToast(`Added ${row.name}`);
  }

  async function onReplaceLiveSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !library) return;
    const invalid = validateLetterPdfFile(file);
    if (invalid) {
      showToast(invalid);
      return;
    }
    const verNum = nextLetterVersion(library.letters);
    const ver = `v${verNum}`;
    const today = formatLetterDate(new Date());
    const row = {
      id: `r-${Date.now()}`,
      name: `Commitment letter ${ver}`,
      ver,
      date: today,
      size: formatFileSize(file.size),
      signed: true,
      live: true,
      by: coachName,
      fileUrl: URL.createObjectURL(file),
    };
    patchLibrary((prev) => ({
      ...prev,
      liveId: row.id,
      letters: [row, ...prev.letters],
    }));
    await syncLiveToApi(file);
    showToast(`Replaced live letter with ${row.name}`);
  }

  function onSignedCopySelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !library) return;
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    const isPdf = type === "application/pdf" || name.endsWith(".pdf");
    const isImage = type.startsWith("image/");
    if (!isPdf && !isImage) {
      showToast("Upload a PDF or image");
      return;
    }
    if (isPdf) {
      const invalid = validateLetterPdfFile(file);
      if (invalid) {
        showToast(invalid);
        return;
      }
    } else {
      const invalid = validateIntroCoverFile(file);
      if (invalid) {
        showToast(invalid);
        return;
      }
    }

    const target = draft || letters[0];
    if (!target) {
      showToast("Upload a letter first");
      return;
    }
    const today = formatLetterDate(new Date());
    patchLibrary((prev) => ({
      ...prev,
      letters: prev.letters.map((row) =>
        row.id === target.id
          ? {
              ...row,
              signed: true,
              date: today,
              size: formatFileSize(file.size),
              name: `Commitment letter ${row.ver}`,
              fileUrl: URL.createObjectURL(file),
              by: coachName,
            }
          : row,
      ),
      signature: {
        ...prev.signature,
        onFile: true,
        name: coachName,
        drawnOn: prev.signature?.drawnOn || today,
      },
    }));
    showToast(`Signed copy attached to ${target.name}`);
  }

  function onSignatureSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !library) return;
    const invalid = validateIntroCoverFile(file);
    if (invalid) {
      showToast(invalid);
      return;
    }
    patchLibrary((prev) => ({
      ...prev,
      signature: {
        name: coachName,
        drawnOn: formatLetterDate(new Date()),
        url: URL.createObjectURL(file),
        onFile: true,
      },
    }));
    showToast(`Signature updated for ${coachName}`);
  }

  if (loading) {
    return (
      <main className="content ua-page-enter ua-commit">
        <BackLink text="Back" to={contentBackTo} />
        <BrandLoader variant="page" label="Loading commitment letters…" />
      </main>
    );
  }

  if (!coachId || !library) {
    return (
      <main className="content ua-page-enter ua-commit">
        <BackLink text="Back" to={contentBackTo} />
        <div className="ua-commit__head">
          <div className="ua-commit__head-copy">
            <h1 className="page-head__title">Commitment Letters</h1>
            <p className="page-head__sub">No coaches available yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="content ua-page-enter ua-commit">
      <BackLink text="Back" to={contentBackTo} />

      <div className="ua-commit__head">
        <div className="ua-commit__head-copy">
          <h1 className="page-head__title">Commitment Letters</h1>
          <p className="page-head__sub">
            {isAdminLibrary
              ? "Every coach's commitment letters. Pick a coach, sign a draft, or set which version clients see."
              : "Your commitment letters. Sign a draft with your saved signature, or upload one you signed by hand."}
          </p>
        </div>
        <div className="ua-commit__head-actions">
          {isAdminLibrary ? (
            <div className="ua-commit__coach-select-wrap">
              <select
                className="ua-commit__coach-select"
                value={coachId || ""}
                title={coaches.find((row) => row.id === coachId)?.name || undefined}
                onChange={(e) => {
                  navigate(UPDATED_ADMIN_PATHS.commitmentLetters(e.target.value), { replace: true });
                }}
              >
                {coaches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {canEdit ? (
            <OrangeButton disabled={busy} onClick={() => startUpload("new")}>
              + Upload letter
            </OrangeButton>
          ) : null}
        </div>
      </div>

      <div className="ua-commit__layout">
        <div className="ua-commit__main">
          <section className={`ua-commit__featured${featured ? " is-live" : ""}`}>
            <div className="ua-commit__featured-kicker">This is what clients see today</div>
            {featured ? (
              <div className="ua-commit__featured-body">
                <div
                  className={`ua-commit__preview${hasFeaturedPreview ? " has-media" : ""}`}
                  role={hasFeaturedPreview ? "button" : undefined}
                  tabIndex={hasFeaturedPreview ? 0 : undefined}
                  onClick={() => hasFeaturedPreview && viewLetter(featured)}
                  onKeyDown={(event) => {
                    if (!hasFeaturedPreview) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      viewLetter(featured);
                    }
                  }}
                  aria-label={hasFeaturedPreview ? `View ${featured.name}` : "Letter preview"}
                >
                  {hasFeaturedPreview ? (
                    featuredPreviewIsImage ? (
                      <img src={featuredPreviewSrc} alt={`${featured.name} preview`} />
                    ) : (
                      <iframe title={featured.name} src={featuredPreviewSrc} />
                    )
                  ) : (
                    <span className="ua-commit__preview-hint">
                      <PreviewPlaceholderIcon />
                      <strong>Letter preview</strong>
                    </span>
                  )}
                </div>
                <div className="ua-commit__featured-info">
                  <div className="ua-commit__featured-title">{featured.name}</div>
                  <div className="ua-commit__featured-note">{featuredMeta(featured, coachName)}</div>
                  <div className="ua-commit__badges">
                    <span className={`ua-commit__badge${featured.signed ? " ua-commit__badge--green" : " ua-commit__badge--amber"}`}>
                      {featured.signed ? "Signed" : "Not signed"}
                    </span>
                    <span className="ua-commit__badge ua-commit__badge--gray">{featured.ver}</span>
                  </div>
                  <div className="ua-commit__featured-actions">
                    <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => viewLetter(featured)}>
                      View
                    </button>
                    <button type="button" className="ua-commit__btn ua-commit__btn--orange" onClick={() => downloadOne(featured)}>
                      Download
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ua-commit__btn ua-commit__btn--ghost"
                        disabled={busy}
                        onClick={() => startUpload("replace-live")}
                      >
                        Replace
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="ua-commit__featured-body">
                <div className="ua-commit__preview">
                  <span className="ua-commit__preview-hint">
                    <PreviewPlaceholderIcon />
                    <strong>Letter preview</strong>
                  </span>
                </div>
                <div className="ua-commit__featured-info">
                  <div className="ua-commit__featured-title">Nothing live yet</div>
                  <div className="ua-commit__featured-note">
                    Sign a letter below and set it live to show it to clients.
                  </div>
                  {canEdit ? (
                    <div className="ua-commit__featured-actions">
                      <button style={{    border: "1px solid rgb(220, 223, 247)",    background: "rgb(238, 240, 252)",
    color: "rgb(94, 106, 210)"}}
                        type="button"
                        className="ua-commit__btn ua-commit__btn--orange"
                        disabled={busy}
                        onClick={() => startUpload("new")}
                      >
                        Upload letter
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section className="ua-commit__list-card">
            <div className="ua-commit__list-title">
              All letters
              <span>
                {letters.length} {letters.length === 1 ? "version" : "versions"}
              </span>
            </div>
            {letters.length ? (
              letters.map((letter) => (
                <div key={letter.id} className={`ua-commit__list-row${letter.live ? " is-live" : ""}`}>
                  <FileIcon live={letter.live} />
                  <div className="ua-commit__list-copy">
                    <div className="ua-commit__list-label-row">
                      <span className="ua-commit__list-label">{letter.name}</span>
                      <span className={`ua-commit__tag${letter.signed ? " ua-commit__tag--green" : " ua-commit__tag--amber"}`}>
                        {letter.signed ? "SIGNED" : "AWAITING SIGNATURE"}
                      </span>
                      {letter.live ? <span className="ua-commit__tag ua-commit__tag--live">LIVE</span> : null}
                    </div>
                    <div className="ua-commit__list-meta">{letterRowMeta(letter)}</div>
                  </div>
                  <div className="ua-commit__list-actions">
                    <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => viewLetter(letter)}>
                      View
                    </button>
                    <button style={{    border: "1px solid rgb(220, 223, 247)",    background: "rgb(238, 240, 252)",
    color: "rgb(94, 106, 210)"}} type="button" className="ua-commit__btn ua-commit__btn--orange" onClick={() => downloadOne(letter)}>
                      Download
                    </button>
                    {canEdit && !letter.live && letter.signed ? (
                      <button type="button" className="ua-commit__btn ua-commit__btn--green" onClick={() => requestSetLive(letter)}>
                        Set live
                      </button>
                    ) : null}
                    {canEdit && !letter.live ? (
                      <button
                        type="button"
                        className="ua-commit__delete"
                        aria-label={`Delete ${letter.name}`}
                        onClick={() => requestDelete(letter)}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="ua-commit__empty">No letters uploaded yet.</p>
            )}
          </section>
        </div>

        <aside className="ua-commit__aside">
          <section className="ua-commit__aside-card">
            <div className="ua-commit__aside-label">Signature</div>
            <div className="ua-commit__signature-panel">
              <div className={`ua-commit__signature-box${hasSignatureImage ? " has-media" : ""}`}>
                {hasSignatureImage ? (
                  <img src={library.signature.url} alt={`${coachName} signature`} />
                ) : (
                  <span className="ua-commit__preview-hint">
                    <SignaturePlaceholderIcon />
                    <strong>{signatureOnFile ? "Signature on file" : "No signature yet"}</strong>
                  </span>
                )}
              </div>
              <div className="ua-commit__signature-foot">
                <div>
                  <div className="ua-commit__signature-name">{library.signature?.name || coachName}</div>
                  <p className="ua-commit__signature-meta">
                    {signatureOnFile
                      ? `Drawn ${library.signature?.drawnOn || "—"} · used on ${signedCount} letters`
                      : "No signature saved yet"}
                  </p>
                </div>
                <span className={`ua-commit__badge${signatureOnFile ? " ua-commit__badge--green" : " ua-commit__badge--gray"}`}>
                  {signatureOnFile ? "ON FILE" : "MISSING"}
                </span>
              </div>
            </div>
            {canEdit ? (
              <button
                type="button"
                className="ua-commit__btn ua-commit__btn--ghost ua-commit__btn--block"
                disabled={busy}
                onClick={() => startUpload("signature")}
              >
                {signatureOnFile ? "Replace signature" : "Upload signature"}
              </button>
            ) : null}
          </section>

          {canEdit ? (
            <section className="ua-commit__aside-card">
              <div className="ua-commit__aside-label">Sign a letter</div>
              <p className="ua-commit__signature-meta">
                {draft
                  ? `“${draft.name}” is waiting for a signature.`
                  : letters.length
                    ? "Every letter here is already signed."
                    : "Upload a letter first, then sign the draft here."}
              </p>
              <button
                type="button"
                className={`ua-commit__sign-auto${draft && signatureOnFile ? " is-ready" : ""}`}
                disabled={!draft || !signatureOnFile || busy}
                onClick={() => (draft && signatureOnFile ? requestSign(draft) : null)}
                title={
                  !draft
                    ? "No draft waiting for a signature"
                    : !signatureOnFile
                      ? "Upload a signature first"
                      : undefined
                }
              >
                <span className="ua-commit__sign-auto-title">Sign with saved signature</span>
                <span className="ua-commit__sign-auto-sub">Attaches it to the page and stamps the date</span>
              </button>
              <button
                type="button"
                className="ua-commit__sign-option"
                disabled={!draft && !featured && !letters[0]}
                onClick={() => downloadOne(draft || featured || letters[0])}
              >
                <span className="ua-commit__sign-option-title">Download to sign by hand</span>
                <span className="ua-commit__sign-option-sub">Print, sign, then upload the scan below</span>
              </button>
              <button type="button" className="ua-commit__sign-upload" onClick={() => startUpload("signed-copy")}>
                <span className="ua-commit__sign-option-title">Upload a signed copy</span>
                <span className="ua-commit__sign-option-sub">PDF or image, replaces the unsigned draft</span>
              </button>
            </section>
          ) : null}
        </aside>
      </div>

      <input ref={uploadRef} type="file" accept="application/pdf,.pdf" hidden onChange={onNewLetterSelected} />
      <input ref={replaceLiveRef} type="file" accept="application/pdf,.pdf" hidden onChange={onReplaceLiveSelected} />
      <input
        ref={previewRef}
        type="file"
        accept="application/pdf,.pdf,image/*"
        hidden
        onChange={onPreviewSelected}
      />
      <input
        ref={signedCopyRef}
        type="file"
        accept="application/pdf,.pdf,image/*"
        hidden
        onChange={onSignedCopySelected}
      />
      <input ref={signatureRef} type="file" accept="image/*" hidden onChange={onSignatureSelected} />

      <ConfirmDialog
        open={!!confirm}
        tag={confirm?.tag}
        title={confirm?.title ?? ""}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        confirmTone={confirm?.confirmTone || "primary"}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </main>
  );
}
