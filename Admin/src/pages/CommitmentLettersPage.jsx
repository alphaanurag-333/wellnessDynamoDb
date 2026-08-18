import { useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { BackLink, OrangeButton } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  COMMITMENT_COACHES,
  getCommitmentCoach,
  getCommitmentData,
} from "../data/commitmentLettersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { myContentForCoach } from "../data/myContentData.js";

export function CommitmentLettersPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const { viewAs, account } = useViewAs();
  const { coachId: routeCoachId } = useParams();
  const isAdminLibrary = viewAs === "admin";
  const ownContent = myContentForCoach(account?.name);
  const coachId = isAdminLibrary ? (routeCoachId || ownContent.id) : ownContent.id;
  const [liveByCoach, setLiveByCoach] = useState({ "anita-rao": "v3", "priya-nair": "v2", "vikram-sethi": "v1" });
  const [confirm, setConfirm] = useState(null);

  const coach = getCommitmentCoach(coachId);
  const data = getCommitmentData(coachId, account?.name || coach.name);
  const liveId = liveByCoach[coachId] ?? data.featuredId;
  const coachName = isAdminLibrary ? coach.name : (account?.name || coach.name);

  const letters = useMemo(
    () => data.letters.map((letter) => ({ ...letter, live: letter.id === liveId })),
    [data.letters, liveId],
  );

  const featured = letters.find((letter) => letter.live) ?? letters.find((letter) => letter.id === data.featuredId) ?? letters[0];
  const draft = letters.find((letter) => letter.status === "draft");

  if (!isAdminLibrary && routeCoachId && routeCoachId !== ownContent.id) {
    return <Navigate to={UPDATED_ADMIN_PATHS.commitmentLetters(ownContent.id)} replace />;
  }

  function requestSetLive(letter) {
    setConfirm({
      kind: "live",
      letter,
      tag: "COMMITMENT LETTER",
      title: `Make ${letter.label} the live one?`,
      body: "Clients see this version in the app from now on. The current live letter stays in the list.",
      confirmLabel: "Yes, set it live",
    });
  }

  function requestSign(letter) {
    setConfirm({
      kind: "sign",
      letter,
      tag: "SIGNATURE",
      title: `Sign ${letter.label} with your saved signature?`,
      body: "Your signature on file is placed on the signature line and today's date is stamped beside it. You can still download the signed copy afterwards.",
      confirmLabel: "Yes, sign it",
    });
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "live") {
      setLiveByCoach((prev) => ({ ...prev, [coachId]: confirm.letter.id }));
      showToast(`${confirm.letter.label} is now live in the app`);
    } else {
      showToast(`${confirm.letter.label} signed with saved signature`);
    }
    setConfirm(null);
  }

  return (
    <main className="content ua-page-enter">
      <BackLink
        label={isAdminLibrary ? "My Content" : "Dashboard"}
        to={isAdminLibrary ? UPDATED_ADMIN_PATHS.myContent : UPDATED_ADMIN_PATHS.dashboard}
      />
      <div className="ua-commit__head">
        <div>
          <h1 className="page-head__title">Commitment Letters</h1>
          <p className="page-head__sub">
            {isAdminLibrary
              ? "Every coach's commitment letters. Pick a coach, sign a draft, or set which version clients see."
              : "Your commitment letters. Sign a draft with your saved signature, or upload one you signed by hand."}
          </p>
        </div>
        <div className="ua-commit__head-actions">
          {isAdminLibrary ? (
            <select
              className="ua-commit__coach-select"
              value={coachId}
              onChange={(e) => {
                const next = e.target.value;
                navigate(UPDATED_ADMIN_PATHS.commitmentLetters(next), { replace: true });
              }}
            >
              {COMMITMENT_COACHES.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          ) : null}
          <OrangeButton onClick={() => showToast("Upload letter — coming soon")}>+ Upload letter</OrangeButton>
        </div>
      </div>

      <div className="ua-commit__layout">
        <div className="ua-commit__main">
          {featured ? (
            <section className="ua-commit__featured">
              <div className="ua-commit__featured-head">
                <div>
                  <div className="ua-commit__featured-title">{featured.label}</div>
                  <div className="ua-commit__featured-note">
                    {featured.status === "signed"
                      ? `Signed ${featured.signed} by ${coachName}`
                      : featured.signed}
                  </div>
                </div>
                <div className="ua-commit__featured-head-end">
                  <div className="ua-commit__featured-kicker">This is what clients see today</div>
                  <div className="ua-commit__badges">
                    {featured.status === "signed" ? <span className="ua-commit__badge ua-commit__badge--green">Signed</span> : null}
                    <span className="ua-commit__badge ua-commit__badge--gray">{featured.id}</span>
                  </div>
                </div>
              </div>
              <div className="ua-commit__preview">Letter preview</div>
              <div className="ua-commit__featured-actions">
                <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => showToast("View letter")}>View</button>
                <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => showToast("Download letter")}>Download</button>
                <button type="button" className="ua-commit__btn ua-commit__btn--primary" onClick={() => showToast("Replace letter")}>Replace</button>
              </div>
            </section>
          ) : (
            <section className="ua-commit__featured">
              <div className="ua-commit__featured-title">No live letter yet</div>
              <div className="ua-commit__featured-note">Upload a signed letter for clients to see.</div>
            </section>
          )}

          <section className="ua-commit__list-card">
            <div className="ua-commit__list-title">
              All letters
              <span>{letters.length} {letters.length === 1 ? "version" : "versions"}</span>
            </div>
            {letters.length ? letters.map((letter) => (
              <div key={letter.id} className="ua-commit__list-row">
                <span className="ua-commit__list-icon" aria-hidden="true">📄</span>
                <div className="ua-commit__list-copy">
                  <div className="ua-commit__list-label">{letter.label}</div>
                  <div className="ua-commit__list-meta">
                    {letter.status === "signed" ? `Signed ${letter.signed}` : letter.signed} · {letter.size}
                  </div>
                </div>
                <div className="ua-commit__list-tags">
                  {letter.status === "signed" ? <span className="ua-commit__tag ua-commit__tag--green">SIGNED</span> : null}
                  {letter.status === "draft" ? <span className="ua-commit__tag ua-commit__tag--amber">AWAITING SIGNATURE</span> : null}
                  {letter.live ? <span className="ua-commit__tag ua-commit__tag--blue">LIVE</span> : null}
                </div>
                <div className="ua-commit__list-actions">
                  <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => showToast("View letter")}>View</button>
                  <button type="button" className="ua-commit__btn ua-commit__btn--ghost" onClick={() => showToast("Download letter")}>Download</button>
                  {!letter.live && letter.status === "signed" ? (
                    <button type="button" className="ua-commit__btn ua-commit__btn--green" onClick={() => requestSetLive(letter)}>
                      Set live
                    </button>
                  ) : null}
                  {!letter.live ? (
                    <button type="button" className="ua-commit__delete" aria-label="Delete letter" onClick={() => showToast("Delete letter")}>🗑</button>
                  ) : null}
                </div>
              </div>
            )) : (
              <p className="page-head__sub" style={{ padding: "12px 16px" }}>No letters uploaded yet.</p>
            )}
          </section>
        </div>

        <aside className="ua-commit__aside">
          <section className="ua-commit__aside-card">
            <div className="ua-commit__aside-label">Signature</div>
            <div className="ua-commit__signature-box">Signature on file</div>
            <div className="ua-commit__signature-name">{data.signatureName || coachName}</div>
            <span className="ua-commit__badge ua-commit__badge--green">ON FILE</span>
            {data.drawnOn ? (
              <p className="ua-commit__signature-meta">
                Drawn {data.drawnOn} · used on {data.usedOn || 0} letters
              </p>
            ) : null}
            <button type="button" className="ua-commit__btn ua-commit__btn--ghost ua-commit__btn--block" onClick={() => showToast("Replace signature")}>
              Replace signature
            </button>
          </section>

          <section className="ua-commit__aside-card">
            <div className="ua-commit__aside-label">Sign a letter</div>
            {draft ? (
              <p className="ua-commit__signature-meta">
                “{draft.label}” is waiting for a signature.
              </p>
            ) : (
              <p className="ua-commit__signature-meta">No draft is waiting for a signature.</p>
            )}
            <button
              type="button"
              className="ua-commit__btn ua-commit__btn--green ua-commit__btn--block"
              onClick={() => {
                if (draft) requestSign(draft);
                else showToast("No draft letter awaiting signature");
              }}
            >
              Sign with saved signature
            </button>
            <p className="ua-commit__signature-meta">Attaches the saved signature and stamps the date.</p>
            <button type="button" className="ua-commit__btn ua-commit__btn--ghost ua-commit__btn--block" onClick={() => showToast("Download to sign by hand")}>
              Download to sign by hand
            </button>
            <div className="ua-commit__upload-box" onClick={() => showToast("Upload a signed copy")}>
              <span>Upload a signed copy</span>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirm}
        tag={confirm?.tag}
        title={confirm?.title ?? ""}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </main>
  );
}
