import { useNavigate, useOutletContext, Navigate } from "react-router-dom";
import { BackLink } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { MY_CONTENT_COACHES, myContentForCoach } from "../data/myContentData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

function ContentToggle({ live, onChange }) {
  return (
    <button
      type="button"
      className={`ua-my-content__toggle${live ? " ua-my-content__toggle--on" : ""}`}
      aria-pressed={live}
      onClick={onChange}
    >
      <span className="ua-my-content__toggle-knob" />
    </button>
  );
}

export function MyContentPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const { viewAs, account } = useViewAs();

  if (viewAs !== "admin") {
    const own = myContentForCoach(account?.name);
    return <Navigate to={UPDATED_ADMIN_PATHS.commitmentLetters(own.id)} replace />;
  }

  return (
    <main className="content ua-page-enter ua-my-content">
      <BackLink label="Dashboard" />
      <div className="ua-my-content__head">
        <div>
          <h1 className="page-head__title">My Content</h1>
          <p className="page-head__sub">
            Intro videos and commitment letters for every coach. Upload, replace or hide any of them.
          </p>
        </div>
      </div>

      <div className="ua-my-content__list">
        {MY_CONTENT_COACHES.map((coach) => (
          <section key={coach.id} className="ua-my-content__coach">
            <div className="ua-my-content__coach-head">
              <span className="ua-my-content__coach-avatar" style={{ background: coach.color }}>
                {coach.initial}
              </span>
              <div className="ua-my-content__coach-copy">
                <div className="ua-my-content__coach-name">{coach.name}</div>
                <div className="ua-my-content__coach-meta">
                  {coach.role} · {coach.clients} clients
                </div>
              </div>
              <span className="ua-my-content__live-badge">{coach.liveLabel}</span>
            </div>

            {coach.items.map((item) => (
              <div key={item.id} className="ua-my-content__item">
                <span className="ua-my-content__item-icon" aria-hidden="true">
                  {item.kind === "video" ? "🎥" : "📄"}
                </span>
                <div className="ua-my-content__item-copy">
                  <div className="ua-my-content__item-title">{item.title}</div>
                  <div className="ua-my-content__item-meta">{item.meta}</div>
                </div>
                {item.live ? <span className="ua-my-content__item-live">LIVE IN APP</span> : null}
                <div className="ua-my-content__item-actions">
                  <button
                    type="button"
                    className="ua-my-content__btn ua-my-content__btn--ghost"
                    onClick={() => {
                      if (item.kind === "letter") {
                        navigate(UPDATED_ADMIN_PATHS.commitmentLetters(item.letterCoachId));
                        return;
                      }
                      showToast(`Opening ${item.title} for ${coach.name}`);
                    }}
                  >
                    {item.secondaryAction}
                  </button>
                  <button
                    type="button"
                    className="ua-my-content__btn ua-my-content__btn--primary"
                    onClick={() => showToast(`${item.primaryAction} ${item.title} for ${coach.name}`)}
                  >
                    {item.primaryAction}
                  </button>
                  <ContentToggle live={item.live} onChange={() => showToast(`Toggled ${item.title} for ${coach.name}`)} />
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
