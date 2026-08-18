import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { CommunityBroadcastModal } from "./CommunityBroadcastModal.jsx";
import { ExportIcon } from "./NavIcons.jsx";
import { AutosaveButton } from "./shared.jsx";
import { ProgramCategoryModal } from "./ProgramCategoryModal.jsx";
import { ProgramProgressModal } from "./ProgramProgressModal.jsx";
import { TeamRemindModal } from "./TeamRemindModal.jsx";
import { StatIcon } from "./DashboardIcons.jsx";
import {
  A1C_METRICS,
  ALERT_SERIOUS_COUNT,
  APP_CLIENT_STATS,
  APP_USER_PROG_CARD,
  BIRTHDAYS,
  CHALLENGE_AUDIENCE_OPTIONS,
  CHALLENGE_DAY_OPTIONS,
  CHAMP_CLIENTS,
  CHAMP_COACHES,
  CHAMP_MONTHS,
  CLIENT_ALERTS,
  COMM_ONB_COUNT,
  COACH_TIERS,
  DASH_ROLE_CARDS,
  DASH_SCOPE_LABELS,
  EXP_CARDS,
  EXP_NOTE,
  EXP_TOTAL,
  FAT_METRICS,
  FY_MONTH_OPTIONS,
  FY_OPTIONS,
  GRADIENT_GREEN,
  LEADERBOARD,
  ONBOARD_DATA,
  ONBOARD_FY_TOTAL,
  OPS_OVERDUE,
  PRODUCT_BARS,
  PROG_CATS,
  REVENUE_CARDS,
  REVENUE_HERO,
  REVENUE_TREND,
  UPDATED_ADMIN_PATHS,
  WC_A1C_METRICS,
  WC_APP_CLIENT_STATS,
  WC_COACH_TIERS,
  WC_COMM_ONB_COUNT,
  WC_EXP_TOTAL,
  WC_FAT_METRICS,
  WC_LEADERBOARD,
  WC_PENDING_GROUPS,
  WC_STALE_RECORDS,
  WC_STALE_TOTAL,
  WC_TEAM_CARDS,
  AWC_A1C_METRICS,
  AWC_APP_CLIENT_STATS,
  AWC_COACH_TIERS,
  AWC_COMM_ONB_COUNT,
  AWC_EXP_TOTAL,
  AWC_FAT_METRICS,
  AWC_LEADERBOARD,
  AWC_PENDING_GROUPS,
  AWC_STALE_RECORDS,
  AWC_STALE_TOTAL,
  SUPPORT_QUICK_INSIGHTS,
  alertStyles,
  buildTierGradient,
} from "../data/dashboardData.js";
import { getProgramCategoryModal } from "../data/programCategoryData.js";
import { UNASSIGNED_COACH } from "../data/usersData.js";
import {
  A1C_METRIC_KEYS,
  FAT_METRIC_KEYS,
  buildLiveProgressModal,
  getProgressModal,
  onboardingRemindCopy,
} from "../data/programProgressData.js";
import {
  TEAM_STAFF,
  remindSubtitle,
} from "../data/teamStaffData.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

function dynamicTiers(baseTiers, rows) {
  if (!Array.isArray(rows)) return baseTiers;
  const values = new Map(rows.map((row) => [row.key, asNumber(row.value)]));
  const keyByFilter = {
    Seek: "seek",
    Consultancy: "consultancy_only",
    "Seek to Heal": "heal",
    Maintenance: "maintenance",
  };
  const next = baseTiers.map((tier) => ({
    ...tier,
    value: values.get(keyByFilter[tier.tierFilter]) ?? 0,
  }));
  const total = next.reduce((sum, tier) => sum + tier.value, 0);
  return next.map((tier) => ({
    ...tier,
    pct: total ? `${Math.round((tier.value / total) * 100)}%` : "0%",
  }));
}

function dynamicPendingGroups(baseGroups, statistics) {
  if (!statistics || !Array.isArray(baseGroups) || baseGroups.length === 0) return baseGroups;
  const first = baseGroups[0];
  const cells = [
    {
      id: "meal-pics",
      short: "Meal logs",
      count: asNumber(statistics.pendingMealApprovals),
      chip: "awaiting",
      color: "#a855f7",
      tipTitle: "Meal logs to review",
      people: [],
    },
    {
      id: "testimonials",
      short: "Reviews",
      count: asNumber(statistics.pendingTestimonials),
      chip: "pending",
      color: "#2b8f5b",
      tipTitle: "Client reviews to approve",
      people: [],
    },
    {
      id: "commitment-letters",
      short: "Letters",
      count: asNumber(statistics.pendingCommitmentLetters),
      chip: "pending",
      color: "#5e6ad2",
      tipTitle: "Commitment letters to approve",
      people: [],
    },
  ];
  const next = [
    {
      ...first,
      total: `${asNumber(statistics.pendingApprovals)} pending`,
      cells,
    },
    ...baseGroups.slice(1),
  ];
  const overdue = statistics.opsOverdue;
  if (!overdue?.cells?.length) return next;
  return next.map((group) => {
    if (String(group.title || "").toLowerCase() !== "overdue") return group;
    return {
      ...group,
      total: overdue.total || `${asNumber(overdue.cells.reduce((sum, cell) => sum + asNumber(cell.count), 0))} pending`,
      cells: overdue.cells.map((cell) => ({
        id: cell.id,
        short: cell.short,
        count: asNumber(cell.count),
        chip: cell.chip,
        color: cell.color,
        tipTitle: cell.tipTitle,
        people: (cell.people || []).map((person) => ({
          name: person.name,
          detail: person.detail,
          initial: person.initial || person.initials,
          color: person.color,
        })),
      })),
    };
  });
}

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
      <div className="stat-card__value">{item.value}</div>
      <div className="stat-card__sub">{item.tag}</div>
    </button>
  );
}

function QuickInsightCard({ item, onClick }) {
  return (
    <button type="button" className="stat-card cdact quick-insight-card" onClick={onClick}>
      <span className="stat-card__bar" style={{ background: item.bar }} />
      <div className="stat-card__top">
        <span className="stat-card__icon" style={{ background: item.bg, color: "#fff", boxShadow: `0 2px 6px ${item.bg}55` }}>
          <StatIcon name={item.iconKey} />
        </span>
        <span className="stat-card__label">{item.label}</span>
      </div>
      <div className="stat-card__value" style={{ color: item.accent }}>{item.value}</div>
      {item.sub ? <div className="stat-card__sub">{item.sub}</div> : null}
    </button>
  );
}

function NotesToRemember({ onToast }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [locked, setLocked] = useState(true);
  const [savedAt, setSavedAt] = useState("");
  const dirty = text !== saved;

  function saveNote() {
    if (!dirty) return;
    const d = new Date();
    const hh = String(d.getHours() % 12 || 12);
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ap = d.getHours() >= 12 ? "PM" : "AM";
    setSaved(text);
    setSavedAt(`Saved ${hh}:${mm} ${ap}`);
    onToast("Note saved");
  }

  function resetNote() {
    if (!dirty) return;
    setText(saved);
    onToast("Note reset to the last save");
  }

  return (
    <div className="coach-notes">
      <div className="coach-notes__head">
        <span className="coach-notes__pin" aria-hidden="true">📌</span>
        <span className="coach-notes__title">Notes to remember</span>
        {savedAt ? <span className="coach-notes__stamp">{savedAt}</span> : null}
      </div>
      <textarea
        className="coach-notes__input"
        placeholder="Anything to pick up later…"
        value={text}
        readOnly={locked}
        onChange={(e) => {
          if (!locked) setText(e.target.value);
        }}
      />
      <div className="coach-notes__actions">
        <button type="button" className="coach-notes__btn coach-notes__btn--edit" onClick={() => setLocked((v) => !v)}>
          {locked ? "Edit" : "Locked"}
        </button>
        <button
          type="button"
          className={`coach-notes__btn coach-notes__btn--reset${dirty ? " coach-notes__btn--reset-dirty" : ""}`}
          onClick={resetNote}
        >
          Reset
        </button>
        <button
          type="button"
          className={`coach-notes__btn coach-notes__btn--save${dirty ? " coach-notes__btn--save-dirty" : ""}`}
          onClick={saveNote}
        >
          {dirty ? "Save" : "Saved"}
        </button>
      </div>
    </div>
  );
}

function isImageIcon(icon) {
  const value = String(icon || "").trim();
  return /^(https?:|blob:|data:|\/)/i.test(value);
}

function CategoryIcon({ icon }) {
  if (isImageIcon(icon)) {
    return <img src={icon} alt="" />;
  }
  return icon || "🌿";
}

function concernKey(value) {
  return String(value || "").trim().toLowerCase();
}

function clientRowFromUser(user) {
  const coach = String(user.coach || "").trim();
  return {
    name: user.name,
    coach: coach && coach !== UNASSIGNED_COACH ? coach : "Not assigned",
    awc: String(user.awc || "").trim() || "Not assigned",
    userId: user.id || null,
  };
}

/** Live clients grouped under both their concern id and concern title. */
function groupClientsByConcern(clients) {
  if (!Array.isArray(clients)) return null;
  const groups = new Map();
  for (const user of clients) {
    const row = clientRowFromUser(user);
    const keys = new Set([concernKey(user.healthConcernId), concernKey(user.goal)]);
    for (const key of keys) {
      if (!key) continue;
      const rows = groups.get(key);
      if (rows) rows.push(row);
      else groups.set(key, [row]);
    }
  }
  return groups;
}

export function AdminDashboard({
  onToast,
  statistics,
  healthConcerns,
  clients,
  loading,
  loadError,
  onRetry,
}) {
  const navigate = useNavigate();
  const { viewAs } = useViewAs();
  const isStaffDash = viewAs === "wc" || viewAs === "awc";
  const isSupportDash = viewAs === "support";
  const isFullDash = viewAs === "admin" || isStaffDash;
  const isAdminDash = viewAs === "admin";
  const isContentCommunity = isStaffDash || isSupportDash;
  const dashHasTeam = viewAs !== "awc";
  const clientsByConcern = useMemo(() => groupClientsByConcern(clients), [clients]);
  const programCards = useMemo(() => {
    if (!Array.isArray(healthConcerns)) {
      return PROG_CATS.map((category) => ({
        ...category,
        count: statistics ? 0 : category.count,
        modalKey: category.label,
        modalLabel: category.label,
      }));
    }
    const concernCounts = statistics?.healthConcernCounts ?? {};
    return healthConcerns
      .filter(
        (option) =>
          option.on &&
          String(option.label || "").trim().toLowerCase() !== "everyday wellness",
      )
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((option, index) => {
        const fallback = PROG_CATS.find(
          (category) =>
            category.value === option.value ||
            category.label.toLowerCase() === String(option.label || "").toLowerCase(),
        );
        const palette = fallback ?? PROG_CATS[index % PROG_CATS.length];
        return {
          ...palette,
          id: option.id,
          value: option.value,
          label: option.label,
          icon: option.icon || fallback?.icon || "🌿",
          count: asNumber(concernCounts[option.id] ?? concernCounts[option.value]),
          modalKey: option.id || option.value || option.label,
          modalLabel: option.label || fallback?.label,
        };
      });
  }, [healthConcerns, statistics]);

  const hasAdminStatistics = statistics && Object.hasOwn(statistics, "totalUsers");
  const hasStaffStatistics = statistics && Object.hasOwn(statistics, "totalClients");
  const statisticsForView = isStaffDash
    ? (hasStaffStatistics ? statistics : null)
    : (hasAdminStatistics ? statistics : null);
  const baseCoachTiers = viewAs === "wc" ? WC_COACH_TIERS : viewAs === "awc" ? AWC_COACH_TIERS : COACH_TIERS;
  const tierRows = statisticsForView?.charts?.clientTiers ?? statisticsForView?.charts?.userTiers;
  const coachTiers = dynamicTiers(baseCoachTiers, tierRows);
  const coachTierTotal = coachTiers.reduce((sum, tier) => sum + tier.value, 0);
  const tierCardTitle = isStaffDash ? "Your clients by tier" : "Clients by tier";
  const baseAppClientStats = viewAs === "wc" ? WC_APP_CLIENT_STATS : viewAs === "awc" ? AWC_APP_CLIENT_STATS : APP_CLIENT_STATS;
  const appClientStats = baseAppClientStats.map((item) => (
    item.tierFilter === "Maintenance" && tierRows?.some((row) => row.key === "maintenance")
      ? { ...item, value: asNumber(tierRows.find((row) => row.key === "maintenance")?.value) }
      : statisticsForView && !item.tierFilter
        ? { ...item, value: "—", tag: "No live source configured" }
        : item
  ));
  const fallbackExpTotal = viewAs === "wc" ? WC_EXP_TOTAL : viewAs === "awc" ? AWC_EXP_TOTAL : EXP_TOTAL;
  const expTotal = statisticsForView ? null : fallbackExpTotal;
  const everydayWellnessConcern = healthConcerns?.find(
    (option) => String(option.label || "").trim().toLowerCase() === "everyday wellness",
  );
  const everydayWellnessCount = asNumber(
    statisticsForView?.healthConcernCounts?.[
      everydayWellnessConcern?.id ?? everydayWellnessConcern?.value
    ],
  );
  const appUserProgramCard = {
    ...APP_USER_PROG_CARD,
    ...(statisticsForView ? { count: everydayWellnessCount } : null),
    modalKey: everydayWellnessConcern?.id || APP_USER_PROG_CARD.label,
    modalLabel: everydayWellnessConcern?.label || APP_USER_PROG_CARD.label,
  };
  const fallbackOnbCount = viewAs === "wc" ? WC_COMM_ONB_COUNT : viewAs === "awc" ? AWC_COMM_ONB_COUNT : COMM_ONB_COUNT;
  const fallbackFatMetrics = viewAs === "wc" ? WC_FAT_METRICS : viewAs === "awc" ? AWC_FAT_METRICS : FAT_METRICS;
  const fallbackA1cMetrics = viewAs === "wc" ? WC_A1C_METRICS : viewAs === "awc" ? AWC_A1C_METRICS : A1C_METRICS;
  const liveProgress = statisticsForView?.programProgress || null;
  const commOnbCount = liveProgress
    ? asNumber(liveProgress.onboarding?.count)
    : statisticsForView
      ? 0
      : fallbackOnbCount;
  const fatMetrics = fallbackFatMetrics.map((metric) => ({
    ...metric,
    count: liveProgress
      ? asNumber(liveProgress.fatLoss?.[FAT_METRIC_KEYS[metric.label]]?.count)
      : statisticsForView
        ? 0
        : metric.count,
  }));
  const a1cMetrics = fallbackA1cMetrics.map((metric) => ({
    ...metric,
    count: liveProgress
      ? asNumber(liveProgress.hba1c?.[A1C_METRIC_KEYS[metric.label]]?.count)
      : statisticsForView
        ? 0
        : metric.count,
  }));
  const opsOverdue = statisticsForView?.opsOverdue || (statisticsForView
    ? {
      title: OPS_OVERDUE.title,
      total: "0 pending",
      cells: OPS_OVERDUE.cells.map((cell) => ({ ...cell, count: 0, people: [] })),
    }
    : OPS_OVERDUE);
  const baseTeamCards = viewAs === "wc" ? WC_TEAM_CARDS : DASH_ROLE_CARDS;
  const teamCards = baseTeamCards.map((team) => {
    if (!statisticsForView) return team;
    if (team.roleId === "wc" && hasAdminStatistics) {
      return { ...team, value: asNumber(statistics.activeWellnessCoaches) };
    }
    if (team.roleId === "awc") {
      const value = hasStaffStatistics ? statistics.totalAssistants : statistics.activeAssistants;
      return { ...team, value: asNumber(value) };
    }
    return team;
  });
  const activeLeaderboard = viewAs === "wc" ? WC_LEADERBOARD : viewAs === "awc" ? AWC_LEADERBOARD : viewAs === "support" ? WC_LEADERBOARD : LEADERBOARD;
  const basePendingGroups = viewAs === "wc" ? WC_PENDING_GROUPS : viewAs === "awc" ? AWC_PENDING_GROUPS : [];
  const pendingGroups = dynamicPendingGroups(basePendingGroups, statisticsForView);
  const staleRecords = viewAs === "wc" ? WC_STALE_RECORDS : viewAs === "awc" ? AWC_STALE_RECORDS : [];
  const staleTotal = viewAs === "wc" ? WC_STALE_TOTAL : viewAs === "awc" ? AWC_STALE_TOTAL : "";
  const scopeLabel = DASH_SCOPE_LABELS[viewAs] ?? "Global";
  const canExport = viewAs === "admin" || viewAs === "wc";
  const [broadcast, setBroadcast] = useState("");
  const [broadcastMeta, setBroadcastMeta] = useState("Last sent 2 days ago");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [champMonth, setChampMonth] = useState("2026-07");
  const [selectedMonth, setSelectedMonth] = useState("Jul 2026");
  const [champExpanded, setChampExpanded] = useState(false);
  const [chName, setChName] = useState("");
  const [chDays, setChDays] = useState("14");
  const [chAud, setChAud] = useState("all");
  const [chRunning, setChRunning] = useState([]);
  const [remindModal, setRemindModal] = useState(null);
  const [programModalTarget, setProgramModalTarget] = useState(null);
  const [progressModalKey, setProgressModalKey] = useState(null);

  const champ = CHAMP_MONTHS[champMonth] ?? CHAMP_MONTHS["2026-07"];
  const maxScore = activeLeaderboard[0]?.score ?? 1;
  const tierData = coachTiers.map((tier) => ({
    label: tier.label === "PWC ONLY" ? "Consultancy only" : tier.label === "HEAL" ? "Heal (paid)" : tier.label === "SEEK" ? "Seek (free)" : "Maintenance",
    value: tier.value,
    color: tier.color,
  }));
  const tierTotal = tierData.reduce((sum, item) => sum + item.value, 0);
  const tierGradient = buildTierGradient(tierData);
  const revenueTotal = asNumber(statisticsForView?.revenueAndPayouts);
  const revenueByMonth = statisticsForView?.charts?.revenueByMonth;
  const latestRevenue = Array.isArray(revenueByMonth) ? revenueByMonth.at(-1) : null;
  const previousRevenue = Array.isArray(revenueByMonth) ? revenueByMonth.at(-2) : null;
  const revenueDelta = previousRevenue?.revenue
    ? Math.round(((asNumber(latestRevenue?.revenue) - asNumber(previousRevenue.revenue)) / asNumber(previousRevenue.revenue)) * 100)
    : 0;
  const revenueHero = statisticsForView && hasAdminStatistics
    ? {
      total: formatInr(revenueTotal),
      scope: "All paid transactions · till today",
      monthLabel: latestRevenue?.label || "Latest month",
      monthValue: formatInr(latestRevenue?.revenue),
      delta: `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}%`,
      deltaUp: revenueDelta >= 0,
    }
    : REVENUE_HERO;
  const revenueProducts = statisticsForView?.charts?.revenueByProduct;
  const payingClientCount = ["consultancy_only", "heal", "maintenance"].reduce(
    (total, key) => total + asNumber(tierRows?.find((row) => row.key === key)?.value),
    0,
  );
  const dynamicRevenueCards = Array.isArray(revenueProducts)
    ? [
        ...revenueProducts.map((row, index) => ({
          label: row.name,
          value: formatInr(row.value),
          share: revenueTotal ? `${Math.round((asNumber(row.value) / revenueTotal) * 100)}% of total` : "0% of total",
          pct: revenueTotal ? Math.round((asNumber(row.value) / revenueTotal) * 100) : 0,
          color: ["#2b8f5b", "#0d9488", "#ec7a45", "#5e6ad2"][index % 4],
        })),
        {
          label: "Avg. per client",
          value: formatInr(payingClientCount ? revenueTotal / payingClientCount : 0),
          share: null,
          pct: 0,
          color: "#a855f7",
          isAvg: true,
        },
      ]
    : REVENUE_CARDS;
  const revenueTrendMax = Math.max(1, ...(revenueByMonth || []).map((row) => asNumber(row.revenue)));
  const revenueTrend = Array.isArray(revenueByMonth)
    ? revenueByMonth.map((row, index) => ({
      label: row.label,
      total: formatInr(row.revenue),
      height: Math.round((asNumber(row.revenue) / revenueTrendMax) * 100),
      active: index === revenueByMonth.length - 1,
    }))
    : REVENUE_TREND.map((row) => ({ ...row, height: row.prog }));
  const productBars = Array.isArray(revenueProducts)
    ? dynamicRevenueCards.filter((card) => !card.isAvg).map((card) => ({
      label: card.label,
      value: card.value,
      pct: card.pct,
      color: card.color,
    }))
    : PRODUCT_BARS;
  const onboardMax = useMemo(() => Math.max(...ONBOARD_DATA.map((d) => d.count)), []);
  const champPodium = activeLeaderboard.slice(0, 3);

  function openBroadcastReview() {
    setBroadcastModalOpen(true);
  }

  function confirmBroadcast() {
    const msg = broadcast.trim();
    if (!msg) {
      onToast("Enter a message to broadcast");
      return;
    }
    setBroadcast("");
    setBroadcastModalOpen(false);
    setBroadcastMeta("Last sent just now");
    onToast("Broadcast sent to all users");
  }

  function startChallenge() {
    const name = chName.trim();
    if (!name) return;
    const audience = CHALLENGE_AUDIENCE_OPTIONS.find((a) => a.value === chAud)?.label ?? "All clients";
    setChRunning((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name,
        progress: `Day 1 of ${chDays}`,
        meta: `${audience} · started today`,
        pct: 4,
      },
    ]);
    setChName("");
    onToast(`Challenge "${name}" started`);
  }

  function endChallenge(id) {
    setChRunning((prev) => prev.filter((c) => c.id !== id));
    onToast("Challenge ended");
  }

  function goUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tab) params.set("tab", filters.tab);
    if (filters.tier) params.set("tier", filters.tier);
    const qs = params.toString();
    navigate(`${UPDATED_ADMIN_PATHS.users}${qs ? `?${qs}` : ""}`);
  }

  function openTeamRemind({ title, subtitle, recipients, defaultMessage }) {
    setRemindModal({ title, subtitle, recipients, defaultMessage, message: defaultMessage });
  }

  function openRemindAll(roleId) {
    const staff = TEAM_STAFF[roleId];
    if (!staff) return;
    openTeamRemind({
      title: staff.defaultRemindAllTitle,
      subtitle: remindSubtitle(staff.rosterTitle, staff.roster.length),
      recipients: staff.roster.map((row) => row.name),
      defaultMessage: staff.defaultRemindMessage,
    });
  }

  const programModal = useMemo(() => {
    if (!programModalTarget) return null;
    const { key, label } = programModalTarget;
    if (!clientsByConcern) return getProgramCategoryModal(label);
    const rows = clientsByConcern.get(concernKey(key)) ?? clientsByConcern.get(concernKey(label)) ?? [];
    return { label, rows };
  }, [clientsByConcern, programModalTarget]);
  const progressModal = liveProgress
    ? buildLiveProgressModal(progressModalKey, liveProgress)
    : getProgressModal(progressModalKey);

  function openProgramCategory(card) {
    const key = card?.modalKey || card?.label;
    const label = card?.modalLabel || card?.label;
    if (!key && !label) return;
    if (!clientsByConcern && !getProgramCategoryModal(label)) return;
    setProgramModalTarget({ key, label });
  }

  function openProgramClient(row) {
    if (row.userId) {
      setProgramModalTarget(null);
      navigate(UPDATED_ADMIN_PATHS.userDetail(row.userId));
      return;
    }
    onToast(`Opening profile for ${row.name}`);
  }

  function openProgressModal(key) {
    if (liveProgress) {
      setProgressModalKey(key);
      return;
    }
    if (!getProgressModal(key)) return;
    setProgressModalKey(key);
  }

  function openProgressClient(row) {
    if (row.userId) {
      setProgressModalKey(null);
      navigate(UPDATED_ADMIN_PATHS.userDetail(row.userId));
      return;
    }
    onToast(`Opening profile for ${row.name}`);
  }

  function goPending(focus = "") {
    const qs = focus ? `?focus=${encodeURIComponent(focus)}` : "";
    navigate(`${UPDATED_ADMIN_PATHS.pending}${qs}`);
  }

  function goConfigs(label) {
    navigate(UPDATED_ADMIN_PATHS.configs);
    onToast(`Opening ${label} in Configs…`);
  }

  function openOnboardingRemind(row) {
    openTeamRemind(onboardingRemindCopy(row));
  }

  if (loading || loadError) {
    return (
      <main className="content ua-page-enter">
        <div className="page-head">
          <div>
            <h1 className="page-head__title">Dashboard</h1>
            <p className="page-head__sub"><span className="chip chip--scope">{scopeLabel}</span></p>
          </div>
        </div>
        <div className="ua-users-empty">
          <div className="ua-users-empty__title">
            {loading ? "Loading dashboard…" : "Couldn’t load dashboard"}
          </div>
          {loadError ? <p className="ua-users-empty__sub">{loadError}</p> : null}
          {loadError ? (
            <button type="button" className="btn btn--outline" onClick={onRetry}>Retry</button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="content ua-page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Dashboard</h1>
          <p className="page-head__sub">
            <span className="chip chip--scope">{scopeLabel}</span> Updated just now
          </p>
        </div>
        <div className="page-head__actions">
          {canExport ? (
            <button type="button" className="btn btn--outline" onClick={() => onToast("Exporting dashboard report…")}>
              <ExportIcon /> Export report
            </button>
          ) : null}
          <AutosaveButton onClick={() => onToast("Saved")} />
        </div>
      </div>

      {isSupportDash ? (
        <section className="section">
          <div className="ua-section-label">
            <div className="ua-section-label__title">Quick insights</div>
            <span className="ua-section-label__hint">Tap a card to jump to its section</span>
          </div>
          <div className="insights-row">
            {SUPPORT_QUICK_INSIGHTS.map((item) => (
              <QuickInsightCard
                key={item.label}
                item={item}
                onClick={() => goConfigs(item.label)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {isFullDash ? (
        <section className="section">
          <div className="ua-section-label">
            <div className="ua-section-label__title">Users</div>
            <span className="ua-section-label__hint">Tap a card to jump to its section</span>
          </div>
          <div className="users-row users-row--v2">
            <div className="tier-card">
              <div className="tier-card__head">
                <span className="tier-card__title">{tierCardTitle}</span>
                <span className="tier-card__total">{coachTierTotal} total</span>
              </div>
              <div className="tier-card__bar">
                {coachTiers.map((t) => (
                  <span key={t.label} className="tier-card__bar-seg" style={{ flex: t.value, background: t.color, minWidth: t.value ? 3 : 0 }} />
                ))}
              </div>
              <div className="tier-card__cells">
                {coachTiers.map((t) => (
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
                      <span>{t.value}</span>
                      <span className="tier-cell__pct">{t.pct}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="app-users-group">
              <div className="app-users-group__title">App clients</div>
              <div className="app-users-group__inner">
                {appClientStats.map((item) => (
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
                <span className="expiry-card__total">
                  {expTotal == null ? "Not available" : `${expTotal} total`}
                </span>
              </div>
              <div className="expiry-card__cells">
                {EXP_CARDS.map((e) => (
                  <button
                    key={e.label}
                    type="button"
                    className="expiry-cell cdact"
                    onClick={() => goUsers()}
                  >
                    <span className="expiry-cell__label">
                      <span className="expiry-cell__dot expiry-cell__dot--pulse" style={{ background: e.color }} />
                      {e.label}
                    </span>
                    <span className="expiry-cell__value">
                      <span style={{ color: e.color }}>{expTotal == null ? "—" : isStaffDash ? expTotal : e.value}</span>
                      <span className="expiry-cell__sub">
                        {expTotal == null ? "No renewal date source configured" : e.sub}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="expiry-card__note">{EXP_NOTE}</p>
            </div>
          </div>
        </section>
      ) : null}

      {isStaffDash ? (
        <section className="section">
          <div className="ua-section-label">
            <div className="ua-section-label__title">Pending Tasks</div>
            <span className="ua-section-label__hint">Hover to see who · click to open the list</span>
          </div>
          <div className="coach-pending-section">
            <div className="coach-pending-cards">
              {pendingGroups.map((group) => (
                <div key={group.title} className={`coach-pending-group ${group.title}`}>
                  <div className="coach-pending-group__head">
                    <span className="coach-pending-group__title">{group.title}</span>
                    <span className="coach-pending-group__total">{group.total}</span>
                  </div>
                  <div className="coach-pending-group__cells">
                    {group.cells.map((cell) => (
                      <button
                        key={cell.id}
                        type="button"
                        className="ptile"
                        onClick={() => goPending(cell.id)}
                      >
                        <span className="ptile__label-row">
                          <span className="ptile__dot" style={{ background: cell.color }} />
                          <span className="ptile__short">{cell.short}</span>
                        </span>
                        <span className="ptile__count-row">
                          <span className="ptile__count">{cell.count}</span>
                          <span className="ptile__chip">{cell.chip}</span>
                        </span>
                        <span className="ptile__tip" role="tooltip">
                          <span className="ptile__tip-title">{cell.tipTitle}</span>
                          {cell.people.map((person) => (
                            <span key={person.name} className="ptile__person">
                              <span className="ptile__avatar" style={{ background: person.color }}>{person.initial}</span>
                              <span className="ptile__person-name">{person.name}</span>
                              <span className="ptile__person-detail">{person.detail}</span>
                            </span>
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="coach-stale-records">
                <div className="coach-stale-records__head">
                  <span className="coach-stale-records__title">Records to refresh</span>
                  <span className="coach-stale-records__total">{staleTotal}</span>
                </div>
                <div className="coach-stale-records__list">
                  {staleRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="coach-stale-records__item"
                      onClick={() => goPending(record.id)}
                    >
                      <span className="coach-stale-records__item-top">
                        <span className="coach-stale-records__dot" style={{ background: record.color }} />
                        <span className="coach-stale-records__label">{record.label}</span>
                        <span className="coach-stale-records__count" style={{ color: record.color }}>{record.count}</span>
                      </span>
                      <span className="coach-stale-records__note">{record.note}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="coach-pending-notes">
                <NotesToRemember onToast={onToast} />
              </div>

            </div>


          </div>
        </section>
      ) : null}
      {isFullDash && !isStaffDash ? (
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Health concern : clients</h2>
          <span className="section__hint">Clients registered per health concern · tap to see who</span>
        </div>
        <div className="prog-cats prog-cats--v2">
          <div className="prog-cats__main">
            <div className="prog-cats__scroll">
              {programCards.map((p) => (
                <button
                  key={p.id || p.value || p.label}
                  type="button"
                  className="prog-cat"
                  style={{ background: p.bg, borderColor: p.border }}
                  onClick={() => openProgramCategory(p)}
                >
                  <span className="prog-cat__icon" style={{ background: "#fff" }}><CategoryIcon icon={p.icon} /></span>
                  <span className="prog-cat__label">{p.label}</span>
                  <span className="prog-cat__count">{p.count}</span>
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
              className="prog-cat prog-cat--appuser"
              style={{ background: appUserProgramCard.bg, borderColor: appUserProgramCard.border }}
              onClick={() => openProgramCategory(appUserProgramCard)}
            >
              <span className="prog-cat__icon" style={{ background: "#fff" }}>{appUserProgramCard.icon}</span>
              <span className="prog-cat__label">{appUserProgramCard.label}</span>
              <span className="prog-cat__count">{appUserProgramCard.count}</span>
            </button>
          </div>
        </div>
      </section>
      ) : null}
      {isFullDash ? (
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Program progress</h2>
          <span className="section__hint">Tap any number to see the clients behind it</span>
        </div>
        <div className="prog-row">
          <button type="button" className="prog-card prog-card--onboard" onClick={() => openProgressModal("onboarding")}>
            <div className="prog-card__head"><span>🚀</span> Onboarding status</div>
            <div className="prog-card__inner">
              <div className="prog-card__tag">In journey</div>
              <div className="prog-card__value prog-card__value--blue">{commOnbCount}</div>
              <div className="prog-card__link">HEAL clients onboarding · view list ›</div>
            </div>
          </button>

          <div className="prog-card prog-card--fat">
            <div className="prog-card__head"><span>🏃</span> Fat Loss</div>
            <div className={`prog-metrics prog-metrics--${fatMetrics.length}`}>
              {fatMetrics.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="metric-btn metric-btn--orange"
                  onClick={() => openProgressModal({ kind: "fat", key: FAT_METRIC_KEYS[m.label] })}
                >
                  <span className="metric-btn__label metric-btn__label--orange">{m.label}</span>
                  <span className="metric-btn__count metric-btn__count--orange">{m.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="prog-card prog-card--a1c">
            <div className="prog-card__head"><span>🩸</span> HbA1c</div>
            <div className={`prog-metrics prog-metrics--${a1cMetrics.length}`}>
              {a1cMetrics.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="metric-btn metric-btn--green"
                  onClick={() => openProgressModal({ kind: "a1c", key: A1C_METRIC_KEYS[m.label] })}
                >
                  <span className="metric-btn__label metric-btn__label--green">{m.label}</span>
                  <span className="metric-btn__count metric-btn__count--green">{m.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isStaffDash ? (
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Health concern : clients</h2>
          <span className="section__hint">Clients registered per health concern · tap to see who</span>
        </div>
        <div className="prog-cats prog-cats--v2">
          <div className="prog-cats__main">
            <div className="prog-cats__scroll">
              {programCards.map((p) => (
                <button
                  key={p.id || p.value || p.label}
                  type="button"
                  className="prog-cat"
                  style={{ background: p.bg, borderColor: p.border }}
                  onClick={() => openProgramCategory(p)}
                >
                  <span className="prog-cat__icon" style={{ background: "#fff" }}><CategoryIcon icon={p.icon} /></span>
                  <span className="prog-cat__label">{p.label}</span>
                  <span className="prog-cat__count">{p.count}</span>
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
              className="prog-cat prog-cat--appuser"
              style={{ background: appUserProgramCard.bg, borderColor: appUserProgramCard.border }}
              onClick={() => openProgramCategory(appUserProgramCard)}
            >
              <span className="prog-cat__icon" style={{ background: "#fff" }}>{appUserProgramCard.icon}</span>
              <span className="prog-cat__label">{appUserProgramCard.label}</span>
              <span className="prog-cat__count" style={{ color: appUserProgramCard.accent }}>{appUserProgramCard.count}</span>
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {isAdminDash ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Operational overview</h2>
            <span className="section__hint">Across every coach · hover to see who</span>
          </div>
          <div className="ops-row">
            <div className="ops-overdue">
              <div className="ops-overdue__head">
                <span className="ops-overdue__title">{opsOverdue.title}</span>
                <span className="ops-overdue__badge">{opsOverdue.total}</span>
              </div>
              <div className="ops-overdue__cells">
                {(opsOverdue.cells || []).map((cell) => (
                  <button
                    key={cell.id}
                    type="button"
                    className="ops-tile"
                    onClick={() => goPending(cell.id)}
                  >
                    <span className="ops-tile__label-row">
                      <span className="ops-tile__dot" style={{ background: cell.color }} />
                      <span className="ops-tile__short">{cell.short}</span>
                    </span>
                    <span className="ops-tile__count-row">
                      <span className="ops-tile__count" style={{ color: cell.color }}>{cell.count}</span>
                      <span className="ops-tile__chip">{cell.chip}</span>
                    </span>
                    <span className="ops-tile__tip" role="tooltip">
                      <span className="ops-tile__tip-title">{cell.tipTitle}</span>
                      {(cell.people || []).map((person) => (
                        <span key={person.userId || person.name} className="ops-tile__person">
                          <span className="ops-tile__avatar" style={{ background: person.color }}>{person.initial}</span>
                          <span className="ops-tile__person-name">{person.name}</span>
                          <span className="ops-tile__person-detail">{person.detail}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ops-challenge">
              <div className="ops-challenge__head">
                <span className="ops-challenge__icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5 1.6-6.8L1.4 9.1l7-.6z"></path></svg></span>
                <span className="ops-challenge__title">Challenges</span>
                <span className="ops-challenge__count">
                  {chRunning.length} RUNNING
                </span>
              </div>
              <div className="ops-challenge__form">
                <input
                  type="text"
                  className="ops-challenge__input"
                  placeholder="Challenge name"
                  value={chName}
                  onChange={(e) => setChName(e.target.value)}
                />
                <select
                  className="ops-challenge__select"
                  aria-label="Challenge length"
                  value={chDays}
                  onChange={(e) => setChDays(e.target.value)}
                >
                  {CHALLENGE_DAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  className="ops-challenge__select ops-challenge__select--aud"
                  aria-label="Challenge audience"
                  value={chAud}
                  onChange={(e) => setChAud(e.target.value)}
                >
                  {CHALLENGE_AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`ops-challenge__start${chName.trim() ? " ops-challenge__start--ready" : ""}`}
                  disabled={!chName.trim()}
                  onClick={startChallenge}
                >
                  Start challenge
                </button>
              </div>
              <div className="ops-challenge__list">
                <div className="ops-challenge__list-inner" aria-hidden="true">IRW</div>
                <div className="ops-challenge__list-items">
                  {chRunning.length === 0 ? (
                    <div className="ops-challenge__empty">
                      No challenge running. Name one, pick a length and audience, then start it.
                    </div>
                  ) : (
                    chRunning.map((challenge) => (
                      <div key={challenge.id} className="ops-challenge__item">
                        <div className="ops-challenge__item-head">
                          <span className="ops-challenge__item-name">{challenge.name}</span>
                          <span className="ops-challenge__item-progress">{challenge.progress}</span>
                          <button
                            type="button"
                            className="ops-challenge__end"
                            title="End challenge"
                            onClick={() => endChallenge(challenge.id)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="ops-challenge__bar">
                          <span className="ops-challenge__bar-fill" style={{ width: `${challenge.pct}%` }} />
                        </div>
                        <div className="ops-challenge__item-meta">{challenge.meta}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Community updates</h2>
          <span className="section__hint">{isContentCommunity ? "Broadcasts & celebrations" : "Broadcasts, celebrations & onboarding"}</span>
        </div>
        <div className={`community-row${isContentCommunity ? " community-row--coach" : ""}`}>
          <div className="community-card">
            <div className="community-card__head"><span>📣</span> Community message</div>
            <input
              type="text"
              className="community-card__input"
              placeholder="Broadcast to everyone…"
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
            />
            <button type="button" className="community-card__send" onClick={openBroadcastReview}>
              Send broadcast
            </button>
            <div className="community-card__meta">{broadcastMeta}</div>
          </div>

          {!isContentCommunity ? (
            <div className="community-card community-card--champion">
              <div className="community-card__head"><span>🏆</span> Champion</div>
              <div className="champion-split">
                <div className="champion-split__col">
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
                <div className="champion-split__col">
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
          ) : null}

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

      {dashHasTeam ? (
        <section className="section">
          <div className="ua-section-label">
            <div className="ua-section-label__title">Team</div>
            <span className="ua-section-label__hint">View a role&apos;s queue or send a reminder</span>
          </div>
          <div className="team-row">
            {teamCards.map((team) => (
              <div key={team.label} className="team-card cdact">
                <span className="stat-card__bar" style={{ background: team.bar }} />
                <div className="stat-card__top">
                  <span className="stat-card__icon" style={{ background: team.bar, color: "#fff", boxShadow: `0 2px 6px ${team.bar}55` }}>
                    <StatIcon name="users" />
                  </span>
                  <span className="stat-card__label">{team.label}</span>
                </div>
                <div className="stat-card__value" >{team.value}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {team.pending.map((tag) => (
                    <span key={tag.label} className="tag" style={{ background: tag.bg, color: tag.color, borderColor: tag.color }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="team-card__actions">
                  <button
                    type="button"
                    className="team-card__view"
                    onClick={() => navigate(UPDATED_ADMIN_PATHS.teams)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="team-card__bell"
                    title="Send reminder"
                    onClick={() => openRemindAll(team.roleId)}
                  >
                    🔔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className="leaderboard"
        onMouseEnter={() => setChampExpanded(true)}
        onMouseLeave={() => setChampExpanded(false)}
      >
        <div className="leaderboard__head">
          <div className="leaderboard__title">
            <span>🏆</span> Champion leaderboard
            {!champExpanded ? <span className="leaderboard__hint">hover to see the full board</span> : null}
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
                <span className={`podium-card__rank ${row.rank === 1 ? "rank--1" : row.rank === 2 ? "rank--2" : "rank--3"}`}>{row.rank === 1 ? "1" : row.rank === 2 ? "2" : "3"}</span>
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

           
            <div className="leaderboard__rows leaderboard__rows--compact">
            <div className="leaderboard__table-head">
              <div>#</div><div>Client</div><div>Score</div><div>Days</div>
            </div>
              {activeLeaderboard.map((row) => (
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

      <section className="section d-none" style={{ display: "none" }}>
        <div className="section__head">
          <h2 className="section__title">Client updates</h2>
          <span className="section__hint">
            Needs attention across your roster
            {ALERT_SERIOUS_COUNT > 0 ? (
              <span className="client-alerts__badge">{ALERT_SERIOUS_COUNT} urgent</span>
            ) : null}
          </span>
        </div>
        <div className="client-alerts">
          {CLIENT_ALERTS.map((alert) => {
            const styles = alertStyles(alert.severity);
            return (
              <button
                key={`${alert.name}-${alert.time}`}
                type="button"
                className="client-alert cdact"
                style={{ background: styles.bg, borderColor: styles.border }}
                onClick={() => onToast(`Opening profile for ${alert.name}`)}
              >
                <span className="client-alert__avatar" style={{ background: styles.dot }}>{alert.initial}</span>
                <span className="client-alert__body">
                  <span className="client-alert__top">
                    <span className="client-alert__name">{alert.name}</span>
                    <span className="client-alert__tag" style={{ color: styles.fg, borderColor: styles.border }}>{alert.label}</span>
                    <span className="client-alert__time">{alert.time}</span>
                  </span>
                  <span className="client-alert__msg">{alert.msg}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isAdminDash ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Revenue Analytics</h2>
              <span className="section__hint">Overall · till today</span>
            </div>
            <div className="revenue-row">
              <div className="revenue-hero">
                <div className="revenue-hero__label">Total revenue</div>
                <div className="revenue-hero__scope">{revenueHero.scope}</div>
                <div className="revenue-hero__value">{revenueHero.total}</div>
                <div className="revenue-hero__foot">
                  <div>
                    <div className="revenue-hero__month-label">{revenueHero.monthLabel}</div>
                    <div className="revenue-hero__month-value">{revenueHero.monthValue}</div>
                  </div>
                  <span className={`revenue-hero__delta${revenueHero.deltaUp ? "" : " revenue-hero__delta--down"}`}>{revenueHero.delta}</span>
                </div>
              </div>
              <div className="revenue-cards">
                {dynamicRevenueCards.map((card) => (
                  <div key={card.label} className="revenue-card">
                    <span className="revenue-card__bar" style={{ background: card.color }} />
                    <div className="revenue-card__label">{card.label}</div>
                    <div className="revenue-card__value" >{card.value}</div>
                    {card.share ? (
                      <>
                        <div className="revenue-card__track">
                          <div className="revenue-card__fill" style={{ width: `${card.pct}%`, background: card.color }} />
                        </div>
                        <div className="revenue-card__share"><span>{card.share}</span></div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head section__head--charts">
              <h2 className="section__title">{statisticsForView ? "Revenue history" : "Financial year · Apr → Mar"}</h2>
              {!statisticsForView ? <div className="chart-controls">
                <button type="button" className="btn btn--soft" onClick={() => onToast("Opening payments…")}>💳 View payments</button>
                <select className="header__select" aria-label="Financial year" defaultValue={FY_OPTIONS[0]}>
                  {FY_OPTIONS.map((fy) => (
                    <option key={fy}>{fy}</option>
                  ))}
                </select>
                <select
                  className="header__select"
                  aria-label="Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {FY_MONTH_OPTIONS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div> : null}
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card__head">
                  <div>
                    <div className="chart-card__title">Revenue trend</div>
                    <div className="chart-card__sub">{statisticsForView ? "Last 6 months · tap a month" : "FY 2026-27 · Apr → Mar · tap a month"}</div>
                  </div>
                  <div className="chart-legend">
                    <span><i className="dot dot--green" /> Revenue</span>
                  </div>
                </div>
                <div className="bar-chart bar-chart--dual">
                  {revenueTrend.map((m) => (
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
                        <div className={`bar bar--prog-${m.active ? "active" : "light"}`} style={{ height: `${m.height}%` }} />
                      </div>
                      <span className={`bar-group__label${m.active ? " bar-group__label--active" : ""}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card__title">Revenue by product</div>
                <div className="chart-card__sub">{statisticsForView ? "All paid transactions" : selectedMonth}</div>
                <div className="product-bars">
                  {productBars.map((p) => (
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
                  <span className="badge badge--green">{ONBOARD_FY_TOTAL} in FY 2026-27</span>
                </div>
                <div className="bar-chart bar-chart--single">
                  {ONBOARD_DATA.map((m) => (
                    <div key={m.label} className="bar-group">
                      <span className="bar-group__total">{m.count}</span>
                      <div className="bar-group__bars">
                        <div
                          className={`bar onboard bar--onboard-${m.active ? "active" : "light"}`}
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
                <div className="chart-card__sub">Seek, Heal, consultancy &amp; maintenance</div>
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
                    {tierData.map((t) => (
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
        </>
      ) : null}

      <ProgramCategoryModal
        open={!!programModal}
        program={programModal}
        onClose={() => setProgramModalTarget(null)}
        onOpenClient={openProgramClient}
      />

      <ProgramProgressModal
        open={!!progressModal}
        modal={progressModal}
        onClose={() => setProgressModalKey(null)}
        onOpenClient={openProgressClient}
        onRemind={openOnboardingRemind}
      />

      <TeamRemindModal
        open={!!remindModal}
        title={remindModal?.title ?? ""}
        subtitle={remindModal?.subtitle ?? ""}
        recipients={remindModal?.recipients ?? []}
        message={remindModal?.message ?? ""}
        defaultMessage={remindModal?.defaultMessage ?? ""}
        onMessageChange={(message) => setRemindModal((prev) => (prev ? { ...prev, message } : prev))}
        onReset={() => setRemindModal((prev) => (prev ? { ...prev, message: prev.defaultMessage } : prev))}
        onPush={() => {
          onToast(`Push sent to ${remindModal?.recipients.length ?? 0} recipient(s)`);
          setRemindModal(null);
        }}
        onWhatsApp={() => {
          onToast(`WhatsApp sent to ${remindModal?.recipients.length ?? 0} recipient(s)`);
          setRemindModal(null);
        }}
        onClose={() => setRemindModal(null)}
      />

      <CommunityBroadcastModal
        open={broadcastModalOpen}
        message={broadcast}
        onMessageChange={setBroadcast}
        onClose={() => setBroadcastModalOpen(false)}
        onSend={confirmBroadcast}
      />
    </main>
  );
}
