import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportIcon } from "./NavIcons.jsx";
import { AutosaveButton } from "./shared.jsx";
import { StatIcon } from "./DashboardIcons.jsx";
import {
  A1C_METRICS,
  APP_CLIENT_STATS,
  APP_USER_PROG_CARD,
  BIRTHDAYS,
  CHAMP_CLIENTS,
  CHAMP_COACHES,
  CHAMP_MONTHS,
  COACH_TIER_TOTAL,
  COACH_TIERS,
  DASH_ROLE_CARDS,
  EXP_CARDS,
  EXP_NOTE,
  EXP_TOTAL,
  FAT_METRICS,
  GRADIENT_GREEN,
  LEADERBOARD,
  ONBOARD_DATA,
  PRODUCT_BARS,
  PROG_CATS,
  REVENUE_CARDS,
  REVENUE_TREND,
  TIER_DATA,
  UPDATED_ADMIN_PATHS,
  buildTierGradient,
} from "../data/dashboardData.js";

function AppClientCard({ item, onClick }) {
  return (
    <button type="button" className="stat-card cdact app-client-card" onClick={onClick}>
      <span className="stat-card__bar" style={{ background: item.bar }} />
      <div className="stat-card__top">
        <span className="stat-card__icon" style={{ background: item.bg, color: "#fff", boxShadow: `0 2px 6px ${item.bg}55` }}>
          <StatIcon name={item.iconKey} />
        </span>
        <span className="stat-card__label">{item.short}</span>
      </div>
      <div className="stat-card__value" style={{ color: item.accent }}>{item.value}</div>
      <div className="stat-card__sub">{item.tag}</div>
    </button>
  );
}

export function UpdatedAdminDashboard({ onToast }) {
  const navigate = useNavigate();
  const [broadcast, setBroadcast] = useState("");
  const [broadcastMeta, setBroadcastMeta] = useState("Last sent 2 days ago");
  const [champMonth, setChampMonth] = useState("2026-07");
  const [selectedMonth, setSelectedMonth] = useState("Jul 2026");
  const [champExpanded, setChampExpanded] = useState(false);

  const champ = CHAMP_MONTHS[champMonth] ?? CHAMP_MONTHS["2026-07"];
  const maxScore = LEADERBOARD[0]?.score ?? 1;
  const tierTotal = useMemo(() => TIER_DATA.reduce((sum, item) => sum + item.value, 0), []);
  const tierGradient = useMemo(() => buildTierGradient(TIER_DATA), []);
  const onboardMax = useMemo(() => Math.max(...ONBOARD_DATA.map((d) => d.count)), []);
  const champPodium = LEADERBOARD.slice(0, 3);

  function sendBroadcast() {
    const msg = broadcast.trim();
    if (!msg) {
      onToast("Enter a message to broadcast");
      return;
    }
    setBroadcast("");
    setBroadcastMeta("Last sent just now");
    onToast("Broadcast sent to all users");
  }

  function goUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tab) params.set("tab", filters.tab);
    if (filters.tier) params.set("tier", filters.tier);
    const qs = params.toString();
    navigate(`${UPDATED_ADMIN_PATHS.users}${qs ? `?${qs}` : ""}`);
  }

  return (
    <main className="content ua-page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Dashboard</h1>
          <p className="page-head__sub">
            <span className="chip chip--scope">Global</span> Updated just now
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--outline" onClick={() => onToast("Exporting dashboard report…")}>
            <ExportIcon /> Export report
          </button>
          <AutosaveButton onClick={() => onToast("Saved")} />
        </div>
      </div>

      <section className="section">
        <div className="ua-section-label">
          <div className="ua-section-label__title">Users</div>
          <span className="ua-section-label__hint">Tap a card to jump to its section</span>
        </div>
        <div className="users-row users-row--v2">
          <div className="tier-card">
            <div className="tier-card__head">
              <span className="tier-card__title">Clients by tier</span>
              <span className="tier-card__total">{COACH_TIER_TOTAL} total</span>
            </div>
            <div className="tier-card__bar">
              {COACH_TIERS.map((t) => (
                <span key={t.label} className="tier-card__bar-seg" style={{ flex: t.value, background: t.color, minWidth: t.value ? 3 : 0 }} />
              ))}
            </div>
            <div className="tier-card__cells">
              {COACH_TIERS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className="tier-cell cdact"
                  onClick={() => goUsers({ tier: t.tierFilter })}
                >
                  <span className="tier-cell__label">
                    <span className="tier-cell__dot" style={{ background: t.color }} />
                    {t.label}
                  </span>
                  <span className="tier-cell__value">
                    <span style={{ color: t.color }}>{t.value}</span>
                    <span className="tier-cell__pct">{t.pct}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="app-users-group">
            <div className="app-users-group__title">App clients</div>
            <div className="app-users-group__inner">
              {APP_CLIENT_STATS.map((item) => (
                <AppClientCard
                  key={item.short}
                  item={item}
                  onClick={() => goUsers({ tab: item.tierFilter ? undefined : "team", tier: item.tierFilter || undefined })}
                />
              ))}
            </div>
          </div>

          <div className="expiry-card">
            <div className="expiry-card__head">
              <span className="expiry-card__title">Expiring in 15 days</span>
              <span className="expiry-card__total">{EXP_TOTAL} total</span>
            </div>
            <div className="expiry-card__cells">
              {EXP_CARDS.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  className="expiry-cell cdact"
                  onClick={() => onToast("Opening expiring subscriptions…")}
                >
                  <span className="expiry-cell__label">
                    <span className="expiry-cell__dot expiry-cell__dot--pulse" style={{ background: e.color }} />
                    {e.label}
                  </span>
                  <span className="expiry-cell__value">
                    <span style={{ color: e.color }}>{e.value}</span>
                    <span className="expiry-cell__sub">{e.sub}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="expiry-card__note">{EXP_NOTE}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="ua-section-label">
          <div className="ua-section-label__title">Team</div>
          <span className="ua-section-label__hint">View a role&apos;s queue or send a reminder</span>
        </div>
        <div className="team-row">
          {DASH_ROLE_CARDS.map((team) => (
            <div key={team.label} className="team-card cdact">
              <span className="stat-card__bar" style={{ background: team.bar }} />
              <div className="stat-card__top">
                <span className="stat-card__icon" style={{ background: team.bar, color: "#fff", boxShadow: `0 2px 6px ${team.bar}55` }}>
                  <StatIcon name="users" />
                </span>
                <span className="stat-card__label">{team.label}</span>
              </div>
              <div className="stat-card__value" style={{ color: team.accent }}>{team.value}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {team.pending.map((tag) => (
                  <span key={tag.label} className="tag" style={{ background: tag.bg, color: tag.color }}>
                    {tag.label}
                  </span>
                ))}
              </div>
              <div className="team-card__actions">
                <button
                  type="button"
                  className="team-card__view"
                  onClick={() => navigate(`${UPDATED_ADMIN_PATHS.teams}?role=${team.roleId}`)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="team-card__bell"
                  title="Send reminder"
                  onClick={() => onToast(`Reminder sent to ${team.label} team`)}
                >
                  🔔
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Community updates</h2>
          <span className="section__hint">Broadcasts, celebrations &amp; onboarding</span>
        </div>
        <div className="community-row">
          <div className="community-card">
            <div className="community-card__head"><span>📣</span> Community message</div>
            <input
              type="text"
              className="community-card__input"
              placeholder="Broadcast to everyone…"
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
            />
            <button type="button" className="btn btn--primary" onClick={sendBroadcast}>Send broadcast</button>
            <p className="community-card__meta">{broadcastMeta}</p>
          </div>

          <div className="community-card community-card--champion">
            <div className="community-card__head"><span>🏆</span> Champion</div>
            <div className="champion-split">
              <div>
                <div className="champion-split__label">Client</div>
                <div className="champion-scroll">
                  {CHAMP_CLIENTS.map((c) => (
                    <div key={c.name} className="champion-mini">
                      <span className="champion-mini__name">{c.name}</span>
                      <span className="champion-mini__score">{c.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="champion-split__label champion-split__label--muted">Wellness coach</div>
                <div className="champion-scroll champion-scroll--plain">
                  {CHAMP_COACHES.map((c) => (
                    <div key={c.name} className="champion-mini champion-mini--plain">
                      <span className="champion-mini__name">{c.name}</span>
                      <span className="champion-mini__score">{c.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="community-card community-card--birthday">
            <div className="community-card__head"><span>🎂</span> Birthdays</div>
            <div className="birthday-scroll">
              {BIRTHDAYS.map((b) => (
                <div key={b.name} className={`birthday-chip${b.isCoach ? " birthday-chip--coach" : ""}`}>
                  <span className="birthday-chip__name"><span>{b.mark}</span>{b.name}</span>
                  <span className="birthday-chip__when">{b.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Program progress</h2>
          <span className="section__hint">Tap any number to see the clients behind it</span>
        </div>
        <div className="prog-row">
          <button type="button" className="prog-card prog-card--onboard" onClick={() => onToast("Opening onboarding list…")}>
            <div className="prog-card__head"><span>🚀</span> Onboarding status</div>
            <div className="prog-card__inner">
              <div className="prog-card__tag">In journey</div>
              <div className="prog-card__value prog-card__value--blue">6</div>
              <div className="prog-card__link">HEAL clients onboarding · view list ›</div>
            </div>
          </button>

          <div className="prog-card prog-card--fat">
            <div className="prog-card__head"><span>🏃</span> Fat Loss</div>
            <div className={`prog-metrics prog-metrics--${FAT_METRICS.length}`}>
              {FAT_METRICS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="metric-btn metric-btn--orange"
                  onClick={() => onToast(`${m.count} clients in "${m.label}"`)}
                >
                  <span className="metric-btn__label metric-btn__label--orange">{m.label}</span>
                  <span className="metric-btn__count metric-btn__count--orange">{m.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="prog-card prog-card--a1c">
            <div className="prog-card__head"><span>🩸</span> HbA1c</div>
            <div className={`prog-metrics prog-metrics--${A1C_METRICS.length}`}>
              {A1C_METRICS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="metric-btn metric-btn--green"
                  onClick={() => onToast(`${m.count} clients in "${m.label}"`)}
                >
                  <span className="metric-btn__label metric-btn__label--green">{m.label}</span>
                  <span className="metric-btn__count metric-btn__count--green">{m.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Program categories : clients</h2>
          <span className="section__hint">Clients registered per program · tap to see who</span>
        </div>
        <div className="prog-cats prog-cats--v2">
          <div className="prog-cats__main">
            <div className="prog-cats__scroll">
              {PROG_CATS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="prog-cat pgcard"
                  style={{ background: p.bg, borderColor: p.border }}
                  onClick={() => onToast(`${p.count} clients in ${p.label}`)}
                >
                  <span className={`prog-cat__icon pgi ${p.animClass || ""}`} style={{ background: "#fff" }}>{p.icon}</span>
                  <span className="prog-cat__label">{p.label}</span>
                  <span className="prog-cat__count" style={{ color: p.accent }}>{p.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="prog-cats__appuser">
            <div className="prog-cats__appuser-head">
              <span className="prog-cats__appuser-label">AppUser</span>
              <span className="prog-cats__appuser-tag">Fixed</span>
            </div>
            <button
              type="button"
              className="prog-cat pgcard prog-cat--appuser"
              style={{ background: APP_USER_PROG_CARD.bg, borderColor: APP_USER_PROG_CARD.border }}
              onClick={() => onToast(`${APP_USER_PROG_CARD.count} clients in ${APP_USER_PROG_CARD.label}`)}
            >
              <span className="prog-cat__icon pgi" style={{ background: "#fff" }}>{APP_USER_PROG_CARD.icon}</span>
              <span className="prog-cat__label">{APP_USER_PROG_CARD.label}</span>
              <span className="prog-cat__count" style={{ color: APP_USER_PROG_CARD.accent }}>{APP_USER_PROG_CARD.count}</span>
            </button>
          </div>
        </div>
      </section>

      <section
        className="leaderboard"
        onMouseEnter={() => setChampExpanded(true)}
        onMouseLeave={() => setChampExpanded(false)}
      >
        <div className="leaderboard__head">
          <div className="leaderboard__title">
            <span>🏆</span> Champion leaderboard
            {!champExpanded ? <span className="leaderboard__hint">Hover to expand</span> : null}
          </div>
          <select
            className="header__select"
            aria-label="Champion month"
            value={champMonth}
            onChange={(e) => setChampMonth(e.target.value)}
          >
            {Object.entries(CHAMP_MONTHS).map(([value, data]) => (
              <option key={value} value={value}>{data.label}</option>
            ))}
          </select>
        </div>

        {!champExpanded ? (
          <div className="leaderboard__podium">
            {champPodium.map((row, i) => (
              <div key={row.rank} className={`podium-card podium-card--${i + 1}`}>
                <span className="podium-card__rank">{row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}</span>
                <div className="podium-card__info">
                  <div className="podium-card__name">{row.name}</div>
                  <div className="podium-card__sub">{row.days} days active</div>
                </div>
                <span className="podium-card__score">{row.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="leaderboard__hero">
              <span className="leaderboard__medal">🥇</span>
              <div className="leaderboard__hero-info">
                <div className="leaderboard__hero-tag">Champion · {champ.label}</div>
                <div className="leaderboard__hero-name">{champ.champion}</div>
              </div>
              <div className="leaderboard__hero-score">
                <div className="leaderboard__hero-points">{champ.score}</div>
                <div className="leaderboard__hero-label">points</div>
              </div>
            </div>

            <div className="leaderboard__table-head">
              <div>#</div><div>Client</div><div>Score</div><div>Days</div>
            </div>
            <div className="leaderboard__rows leaderboard__rows--compact">
              {LEADERBOARD.map((row) => (
                <div
                  key={row.rank}
                  className={`leaderboard__row${row.highlight ? " leaderboard__row--highlight" : ""}`}
                  onClick={() => onToast(`Opening profile for ${row.name}`)}
                  onKeyDown={(e) => e.key === "Enter" && onToast(`Opening profile for ${row.name}`)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="leaderboard__rank">{row.rank}</span>
                  <div>
                    <div className="leaderboard__name">
                      {row.name}
                      {row.medal ? <span> {row.medal}</span> : null}
                    </div>
                    <div className="leaderboard__bar-wrap">
                      <div className="leaderboard__bar" style={{ width: `${Math.round((row.score / maxScore) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="leaderboard__score">{row.score}</div>
                  <div className="leaderboard__days">{row.days}d</div>
                </div>
              ))}
            </div>
            <p className="leaderboard__foot">
              ⚙️ Ranked automatically from Daily Reflection scores · {champ.label} · 10 clients
            </p>
          </>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Revenue Analytics</h2>
          <span className="section__hint">Overall · till today</span>
        </div>
        <div className="revenue-row">
          <div className="revenue-hero">
            <div className="revenue-hero__label">Total revenue</div>
            <div className="revenue-hero__scope">All time · till 25 Jul 2026</div>
            <div className="revenue-hero__value">Rs. 39.99L</div>
            <div className="revenue-hero__foot">
              <div>
                <div className="revenue-hero__month-label">Jul 2026</div>
                <div className="revenue-hero__month-value">Rs. 3.45L</div>
              </div>
              <span className="revenue-hero__delta">+5%</span>
            </div>
          </div>
          <div className="revenue-cards">
            {REVENUE_CARDS.map((card) => (
              <div key={card.label} className="revenue-card">
                <span className="revenue-card__bar" style={{ background: card.color }} />
                <div className="revenue-card__label">{card.label}</div>
                <div className="revenue-card__value" style={{ color: card.color }}>{card.value}</div>
                {card.share ? (
                  <>
                    <div className="revenue-card__track">
                      <div className="revenue-card__fill" style={{ width: `${card.pct}%`, background: card.color }} />
                    </div>
                    <div className="revenue-card__share">
                      <span>{card.share}</span>
                      {card.delta ? <span className="revenue-card__delta revenue-card__delta--up">{card.delta}</span> : null}
                    </div>
                  </>
                ) : card.isAvg && card.delta ? (
                  <div className="revenue-card__avg-delta">
                    <span className="revenue-card__delta revenue-card__delta--up">{card.delta}</span>
                    <span className="revenue-card__avg-note">vs prev month</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head section__head--charts">
          <h2 className="section__title">Financial year · Apr → Mar</h2>
          <div className="chart-controls">
            <button type="button" className="btn btn--soft" onClick={() => onToast("Opening payments…")}>💳 View payments</button>
            <select className="header__select" aria-label="Financial year" defaultValue="FY 2026-27">
              <option>FY 2026-27</option>
              <option>FY 2025-26</option>
            </select>
            <select
              className="header__select"
              aria-label="Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option>Jul 2026</option>
              <option>Jun 2026</option>
              <option>May 2026</option>
              <option>Apr 2026</option>
            </select>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-card__head">
              <div>
                <div className="chart-card__title">Revenue trend</div>
                <div className="chart-card__sub">FY 2026-27 · Apr → Mar · tap a month</div>
              </div>
              <div className="chart-legend">
                <span><i className="dot dot--green" /> Program</span>
                <span><i className="dot dot--blue" /> Consultancy</span>
              </div>
            </div>
            <div className="bar-chart bar-chart--dual">
              {REVENUE_TREND.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="bar-group"
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                  onClick={() => {
                    setSelectedMonth(`${m.label} 2026`);
                    onToast(`Selected ${m.label} 2026 revenue`);
                  }}
                >
                  <span className="bar-group__total">{m.total}</span>
                  <div className="bar-group__bars">
                    <div className={`bar bar--prog-${m.active ? "active" : "light"}`} style={{ height: `${m.prog}%` }} />
                    <div className={`bar bar--cons-${m.active ? "active" : "light"}`} style={{ height: `${m.cons}%` }} />
                  </div>
                  <span className={`bar-group__label${m.active ? " bar-group__label--active" : ""}`}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__title">Revenue by product</div>
            <div className="chart-card__sub">{selectedMonth}</div>
            <div className="product-bars">
              {PRODUCT_BARS.map((p) => (
                <div key={p.label}>
                  <div className="product-bar__head">
                    <span className="product-bar__label">{p.label}</span>
                    <span className="product-bar__value">{p.value}</span>
                  </div>
                  <div className="product-bar__track">
                    <div
                      className="product-bar__fill"
                      style={{
                        width: `${p.pct}%`,
                        background: p.color === "#2b8f5b" ? GRADIENT_GREEN : p.color,
                      }}
                    />
                  </div>
                  <div className="product-bar__pct">{p.pct}% of month</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__head">
              <div>
                <div className="chart-card__title">Users onboarded</div>
                <div className="chart-card__sub">FY 2026-27 · Apr → Mar</div>
              </div>
              <span className="badge badge--green">97 in FY 2026-27</span>
            </div>
            <div className="bar-chart bar-chart--single">
              {ONBOARD_DATA.map((m) => (
                <div key={m.label} className="bar-group">
                  <span className="bar-group__total">{m.count}</span>
                  <div className="bar-group__bars">
                    <div
                      className={`bar bar--onboard-${m.active ? "active" : "light"}`}
                      style={{ height: `${Math.round((m.count / onboardMax) * 100)}%`, width: "55%" }}
                    />
                  </div>
                  <span className={`bar-group__label${m.active ? " bar-group__label--active" : ""}`}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__title">Users by tier</div>
            <div className="chart-card__sub">Seek, Heal &amp; consultancy-only</div>
            <div className="tier-chart">
              <div className="tier-chart__donut">
                <div className="donut" style={{ background: `conic-gradient(${tierGradient})` }}>
                  <div className="donut__hole">
                    <div className="donut__total">{tierTotal}</div>
                    <div className="donut__label">clients</div>
                  </div>
                </div>
              </div>
              <div className="tier-chart__legend">
                {TIER_DATA.map((t) => (
                  <div key={t.label} className="tier-legend-item">
                    <span className="tier-legend-item__dot" style={{ background: t.color }} />
                    <span className="tier-legend-item__label">{t.label}</span>
                    <span className="tier-legend-item__value">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
