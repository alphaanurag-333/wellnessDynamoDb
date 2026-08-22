import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardMediaBlob, fetchDashboardPayments } from "../api/dashboardApi.js";
import { pushOnboardingReminder } from "../api/onboardingApi.js";
import { fetchTeamMembers, sendTeamReminder } from "../api/teamsApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { CommunityBroadcastModal } from "./CommunityBroadcastModal.jsx";
import { BrandLoader } from "./BrandLoader.jsx";
import { ProgramCategoryModal } from "./ProgramCategoryModal.jsx";
import { ProgramProgressModal } from "./ProgramProgressModal.jsx";
import { TeamRemindModal } from "./TeamRemindModal.jsx";
import { TeamRosterModal } from "./TeamRosterModal.jsx";
import { PaymentsModal } from "./PaymentsModal.jsx";
import { StatIcon } from "./DashboardIcons.jsx";
import {
  A1C_METRICS,
  APP_CLIENT_STATS,
  APP_USER_PROG_CARD,
  CHALLENGE_AUDIENCE_OPTIONS,
  CHALLENGE_DAY_OPTIONS,
  COACH_TIERS,
  DASH_SCOPE_LABELS,
  EXP_CARDS,
  EXP_NOTE,
  FAT_METRICS,
  GRADIENT_GREEN,
  OPS_OVERDUE,
  PROG_CATS,
  UPDATED_ADMIN_PATHS,
  WC_A1C_METRICS,
  WC_APP_CLIENT_STATS,
  WC_COACH_TIERS,
  WC_FAT_METRICS,
  WC_PENDING_GROUPS,
  WC_STALE_RECORDS,
  AWC_A1C_METRICS,
  AWC_APP_CLIENT_STATS,
  AWC_COACH_TIERS,
  AWC_FAT_METRICS,
  AWC_PENDING_GROUPS,
  AWC_STALE_RECORDS,
  SUPPORT_QUICK_INSIGHTS,
  buildTierGradient,
} from "../data/dashboardData.js";
import { UNASSIGNED_COACH } from "../data/usersData.js";
import {
  A1C_METRIC_KEYS,
  FAT_METRIC_KEYS,
  buildLiveProgressModal,
  onboardingRemindCopy,
} from "../data/programProgressData.js";
import {
  DEFAULT_REMIND_MESSAGE,
  TEAM_STAFF,
  remindSubtitle,
  staffRemindMessage,
} from "../data/teamStaffData.js";
import {
  PRODUCT_COLORS,
  findFinancialYear,
  formatRevenue,
  resolveRevenueAnalytics,
} from "../data/revenueAnalytics.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const mediaDataUrlCache = new Map();

async function imageSrcToDataUrl(src) {
  if (!src || src.startsWith("data:")) return src;
  const cached = mediaDataUrlCache.get(src);
  if (cached) return cached;
  try {
    const blob = await fetchDashboardMediaBlob(src);
    if (blob && blob.size) {
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.startsWith("data:image") || dataUrl.startsWith("data:application/octet-stream")) {
        mediaDataUrlCache.set(src, dataUrl);
        return dataUrl;
      }
    }
  } catch {
    /* try direct fetch next */
  }
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const dataUrl = await blobToDataUrl(await res.blob());
    mediaDataUrlCache.set(src, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

const CAPTURE_FIX_CSS = `
  .is-capturing,
  .is-capturing * {
    animation: none !important;
    transition: none !important;
  }
  .is-capturing {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

function applyCaptureCloneFix(doc, cloned) {
  cloned.classList.add("is-capturing");
  cloned.style.opacity = "1";
  cloned.style.transform = "none";
  cloned.style.animation = "none";
  cloned.style.background = "#eef1f7";
  cloned.style.maxHeight = "none";
  cloned.style.overflow = "visible";
  const style = doc.createElement("style");
  style.textContent = CAPTURE_FIX_CSS;
  doc.head.appendChild(style);
}

async function waitForCaptureReady() {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* ignore font readiness errors */
  }
  await nextPaint();
  await nextPaint();
}

async function inlineCrossOriginImages(root) {
  const imgs = [...root.querySelectorAll("img")];
  const restores = [];
  await Promise.all(imgs.map(async (img) => {
    const original = img.currentSrc || img.getAttribute("src") || img.src;
    if (!original || original.startsWith("data:") || original.startsWith("blob:")) return;
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const dataUrl = await imageSrcToDataUrl(original);
    if (!dataUrl) return;
    restores.push(() => {
      img.src = original;
      img.removeAttribute("crossorigin");
      img.removeAttribute("referrerpolicy");
    });
    img.src = dataUrl;
    try {
      await img.decode();
    } catch {
      /* ignore decode errors */
    }
  }));
  await nextPaint();
  return () => restores.forEach((fn) => fn());
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = String(dataUrl).split(",");
  const mime = /data:([^;]+)/.exec(header)?.[1] || "image/png";
  const binary = atob(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
        } catch (err) {
          reject(err);
        }
      }, "image/png");
    } catch (err) {
      try {
        resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
      } catch (inner) {
        reject(inner || err);
      }
    }
  });
}

function safePixelRatio(width, height, maxSide) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return Math.max(0.2, Math.min(2, maxSide / w, maxSide / h));
}

function skipCaptureNoise(el, { skipImages = false } = {}) {
  if (!(el instanceof Element)) return true;
  if (el.classList.contains("page-head__actions") || el.classList.contains("ua-dash-export")) return false;
  const tag = el.tagName;
  if (tag === "IFRAME" || tag === "VIDEO" || tag === "CANVAS") return false;
  if (skipImages && (tag === "IMG" || tag === "IMAGE")) return false;
  return true;
}

function unlockOverflow(node) {
  const restored = [];
  let current = node;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.overflow !== "visible" || style.overflowY !== "visible" || style.overflowX !== "visible") {
      restored.push({
        el: current,
        overflow: current.style.overflow,
        overflowX: current.style.overflowX,
        overflowY: current.style.overflowY,
      });
      current.style.overflow = "visible";
      current.style.overflowX = "visible";
      current.style.overflowY = "visible";
    }
    current = current.parentElement;
  }
  return () => {
    restored.forEach((item) => {
      item.el.style.overflow = item.overflow;
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
    });
  };
}

async function captureWithHtmlToImage(node, width, height) {
  const { toCanvas } = await import("html-to-image");
  const attempts = [
    { maxSide: 8192, skipImages: false },
    { maxSide: 4096, skipImages: false },
    { maxSide: 4096, skipImages: true },
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const canvas = await toCanvas(node, {
        pixelRatio: safePixelRatio(width, height, attempt.maxSide),
        backgroundColor: "#eef1f7",
        skipFonts: true,
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
        filter: (el) => skipCaptureNoise(el, attempt),
        style: {
          animation: "none",
          transition: "none",
          opacity: "1",
          transform: "none",
          background: "#eef1f7",
        },
      });
      if (!canvas?.width || !canvas?.height) {
        lastError = new Error("Empty screenshot canvas");
        continue;
      }
      return await canvasToPngBlob(canvas);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Could not capture screenshot");
}

async function captureWithHtml2Canvas(node, width, height) {
  const mod = await import("html2canvas-pro");
  const html2canvas = mod.default || mod.html2canvas;
  const scale = safePixelRatio(width, height, 4096);
  const canvas = await html2canvas(node, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#eef1f7",
    logging: false,
    imageTimeout: 15000,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: -window.scrollY,
    ignoreElements: (el) => !skipCaptureNoise(el),
    onclone: (doc, cloned) => {
      applyCaptureCloneFix(doc, cloned);
      cloned.style.width = `${width}px`;
      cloned.style.height = `${height}px`;
    },
  });
  if (!canvas?.width || !canvas?.height) throw new Error("Empty screenshot canvas");
  return canvasToPngBlob(canvas);
}

async function capturePageScreenshot(node) {
  const width = Math.ceil(Math.max(node.scrollWidth, node.offsetWidth, node.clientWidth, 1));
  const height = Math.ceil(Math.max(node.scrollHeight, node.offsetHeight, node.clientHeight, 1));
  node.classList.add("is-capturing");
  node.style.opacity = "1";
  node.style.transform = "none";
  node.style.animation = "none";
  const restoreOverflow = unlockOverflow(node);
  await waitForCaptureReady();
  const restoreImages = await inlineCrossOriginImages(node);
  const shell = node.closest(".page-shell");
  const prevScroll = shell?.scrollTop ?? 0;
  if (shell) shell.scrollTop = 0;
  window.scrollTo(0, 0);
  try {
    try {
      return await captureWithHtmlToImage(node, width, height);
    } catch (first) {
      try {
        return await captureWithHtml2Canvas(node, width, height);
      } catch (second) {
        throw second || first;
      }
    }
  } finally {
    if (shell) shell.scrollTop = prevScroll;
    restoreImages();
    restoreOverflow();
    node.classList.remove("is-capturing");
    node.style.opacity = "";
    node.style.transform = "";
    node.style.animation = "";
  }
}

function pendingChipsForRole(roleId, statistics) {
  if (!statistics || roleId !== "wc") return [];
  const chips = [];
  const assignments = asNumber(statistics.pendingUserAssignments);
  const approvals = asNumber(statistics.pendingCoachApprovals);
  if (assignments > 0) {
    chips.push({
      label: `${assignments} assignment${assignments === 1 ? "" : "s"} pending`,
      bg: "#fdf3ec",
      color: "#c2661d",
    });
  }
  if (approvals > 0) {
    chips.push({
      label: `${approvals} coach approval${approvals === 1 ? "" : "s"} pending`,
      bg: "#fdf3ec",
      color: "#c2661d",
    });
  }
  return chips;
}

function teamCardsFromStats(rows, { excludeIds = [] } = {}) {
  const skip = new Set(["admin", ...excludeIds]);
  return (rows || [])
    .filter((row) => row && !skip.has(row.roleKey) && !skip.has(row.id))
    .map((row) => ({
      label: row.name,
      roleId: row.roleKey || row.id,
      consoleRoleId: row.id,
      value: asNumber(row.memberCount),
      accent: row.color || "#5e6ad2",
      bar: row.color || "#5e6ad2",
      pending: Array.isArray(row.pending) ? row.pending : [],
    }));
}

function teamCardsFromRoles(roles, { excludeIds = [], statisticsForView } = {}) {
  const skip = new Set(["admin", ...excludeIds]);
  return (roles || [])
    .filter((role) => role && !skip.has(role.id))
    .map((role) => ({
      label: role.name,
      roleId: role.id,
      consoleRoleId: role.dbId || role.id,
      value: asNumber(role.live),
      accent: role.color || "#5e6ad2",
      bar: role.color || "#5e6ad2",
      pending: pendingChipsForRole(role.id, statisticsForView),
    }));
}

function dynamicTiers(baseTiers, rows) {
  const keyByFilter = {
    Seek: "seek",
    Consultancy: "consultancy_only",
    "Seek to Heal": "heal",
    Maintenance: "maintenance",
  };
  const values = Array.isArray(rows)
    ? new Map(rows.map((row) => [row.key, asNumber(row.value)]))
    : null;
  const next = (baseTiers || []).map((tier) => ({
    ...tier,
    // Live only: missing API tier rows → 0, never keep demo seed counts.
    value: values ? (values.get(keyByFilter[tier.tierFilter]) ?? 0) : 0,
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
  return next.map((group) => {
    const title = String(group.title || "").toLowerCase();
    if (title === "overdue") {
      const overdue = statistics.opsOverdue;
      const liveCells = overdue?.cells?.length
        ? overdue.cells.map((cell) => ({
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
          }))
        : group.cells.map((cell) => ({ ...cell, count: 0, people: [] }));
      const totalCount = liveCells.reduce((sum, cell) => sum + asNumber(cell.count), 0);
      return {
        ...group,
        total: overdue?.total || `${totalCount} pending`,
        cells: liveCells,
      };
    }
    if (title === "schedule") {
      const schedule = statistics.schedule;
      const liveCells = schedule?.cells?.length
        ? schedule.cells.map((cell) => ({
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
          }))
        : group.cells.map((cell) => ({ ...cell, count: 0, people: [] }));
      const totalCount = liveCells.reduce((sum, cell) => sum + asNumber(cell.count), 0);
      return {
        ...group,
        total: schedule?.total || `${totalCount} pending`,
        cells: liveCells,
      };
    }
    return group;
  });
}

function liveStaleRecords(statistics, fallbackRecords, fallbackTotal) {
  if (!statistics) return { records: fallbackRecords, total: fallbackTotal };
  const live = statistics.staleRecords;
  if (Array.isArray(live?.items) && live.items.length) {
    return {
      records: live.items.map((item) => ({
        id: item.id,
        label: item.label,
        count: asNumber(item.count),
        note: item.note,
        color: item.color,
      })),
      total: live.total || `${live.items.reduce((sum, item) => sum + asNumber(item.count), 0)} due`,
    };
  }
  return {
    records: (fallbackRecords || []).map((record) => ({ ...record, count: 0 })),
    total: "0 due",
  };
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
      <div className="stat-card__value" style={{ color: "black" }}>{item.value}</div>
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

function dayKeyIst(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
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
  refreshing = false,
  updatedLabel = "Not loaded yet",
  loadError,
  onRetry,
  onRefresh,
}) {
  const navigate = useNavigate();
  const { viewAs: viewAsId, viewAsPersona, liveMenuRoles, liveRolesReady, can } = useViewAs();
  const canExport = can("console.dash.export");
  const canViewRevenue = can("console.rev.view");
  // Prefer the selected View-as id for admin; persona is only for custom staff roles.
  const viewAs = viewAsId === "admin" ? "admin" : (viewAsPersona || viewAsId);
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
        count: 0,
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
  const appClientStats = baseAppClientStats.map((item) => {
    if (!statisticsForView) return { ...item, value: 0 };
    if (item.categoryFilter === "eagle" || item.short === "Eagles") {
      return { ...item, value: asNumber(statisticsForView.eagleUsers) };
    }
    if (item.tierFilter === "Maintenance") {
      return { ...item, value: asNumber(tierRows?.find((row) => row.key === "maintenance")?.value) };
    }
    return { ...item, value: "—", tag: "No live source configured" };
  });
  const subscriptionExpiry = statisticsForView?.subscriptionExpiry || null;
  const expWindowDays = asNumber(subscriptionExpiry?.windowDays) || 15;
  const expTotal = statisticsForView
    ? asNumber(subscriptionExpiry?.count)
    : 0;
  const expSoonestDays = statisticsForView && subscriptionExpiry?.soonestDays != null
    ? asNumber(subscriptionExpiry.soonestDays)
    : null;
  const expSubLabel = !statisticsForView || expTotal <= 0
    ? "none ending soon"
    : expSoonestDays != null
      ? `soonest in ${expSoonestDays} day${expSoonestDays === 1 ? "" : "s"}`
      : "ending within window";
  const registeredTodayLive = statisticsForView?.registeredToday || null;
  const registeredTodayRows = useMemo(() => {
    if (!Array.isArray(clients)) return null;
    const todayKey = dayKeyIst(new Date());
    return clients
      .filter((user) => dayKeyIst(user.createdAt) === todayKey)
      .map(clientRowFromUser);
  }, [clients]);
  const registeredTodayCount = statisticsForView
    ? (
      registeredTodayLive && Object.hasOwn(registeredTodayLive, "count")
        ? asNumber(registeredTodayLive.count)
        : (registeredTodayRows?.length ?? 0)
    )
    : 0;
  const appUserProgramCard = {
    ...APP_USER_PROG_CARD,
    count: registeredTodayCount,
    modalKey: "registered-today",
    modalLabel: APP_USER_PROG_CARD.label,
    registeredToday: true,
  };
  const fallbackFatMetrics = viewAs === "wc" ? WC_FAT_METRICS : viewAs === "awc" ? AWC_FAT_METRICS : FAT_METRICS;
  const fallbackA1cMetrics = viewAs === "wc" ? WC_A1C_METRICS : viewAs === "awc" ? AWC_A1C_METRICS : A1C_METRICS;
  const liveProgress = statisticsForView?.programProgress || null;
  const commOnbCount = liveProgress
    ? asNumber(liveProgress.onboarding?.count)
    : 0;
  const fatMetrics = fallbackFatMetrics.map((metric) => ({
    ...metric,
    count: liveProgress
      ? asNumber(liveProgress.fatLoss?.[FAT_METRIC_KEYS[metric.label]]?.count)
      : 0,
  }));
  const a1cMetrics = fallbackA1cMetrics.map((metric) => ({
    ...metric,
    count: liveProgress
      ? asNumber(liveProgress.hba1c?.[A1C_METRIC_KEYS[metric.label]]?.count)
      : 0,
  }));
  const opsOverdue = statisticsForView?.opsOverdue || {
    title: OPS_OVERDUE.title,
    total: "0 pending",
    cells: OPS_OVERDUE.cells.map((cell) => ({ ...cell, count: 0, people: [] })),
  };
  const excludeTeamIds = viewAs === "wc" ? ["wc"] : [];
  const liveTeamRoles = statisticsForView?.teamRoles;
  const catalogTeamCards = Array.isArray(liveTeamRoles)
    ? teamCardsFromStats(liveTeamRoles, { excludeIds: excludeTeamIds })
    : teamCardsFromRoles(
        liveRolesReady
          ? (liveMenuRoles || []).filter((role) => role.dbId)
          : [],
        { excludeIds: excludeTeamIds, statisticsForView },
      );
  const teamCards = catalogTeamCards;
  const liveCommunity = statistics?.community || null;
  const birthdayRows = liveCommunity ? (liveCommunity.birthdays || []) : [];
  const champClients = liveCommunity ? (liveCommunity.champions?.clients || []) : [];
  const champCoaches = liveCommunity ? (liveCommunity.champions?.coaches || []) : [];
  const liveLeaderboard = liveCommunity?.leaderboard;
  const activeLeaderboard = liveCommunity ? (liveLeaderboard?.rows || []) : [];
  const basePendingGroups = viewAs === "wc" ? WC_PENDING_GROUPS : viewAs === "awc" ? AWC_PENDING_GROUPS : [];
  const pendingGroups = dynamicPendingGroups(
    basePendingGroups.map((group) => ({
      ...group,
      total: statisticsForView ? group.total : "0 pending",
      cells: (group.cells || []).map((cell) => (
        statisticsForView ? cell : { ...cell, count: 0, people: [] }
      )),
    })),
    statisticsForView,
  );
  const { records: staleRecords, total: staleTotal } = liveStaleRecords(
    statisticsForView,
    (viewAs === "wc" ? WC_STALE_RECORDS : viewAs === "awc" ? AWC_STALE_RECORDS : []).map((record) => ({
      ...record,
      count: 0,
    })),
    "0 due",
  );
  const scopeLabel = DASH_SCOPE_LABELS[viewAs] ?? "Global";
  const [broadcast, setBroadcast] = useState("");
  const [broadcastMeta, setBroadcastMeta] = useState("No broadcasts sent yet");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [champMonth, setChampMonth] = useState("2026-07");
  const [selectedFyStartYear, setSelectedFyStartYear] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [productMonthKey, setProductMonthKey] = useState(null);
  const [champExpanded, setChampExpanded] = useState(false);
  const [chName, setChName] = useState("");
  const [chDays, setChDays] = useState("14");
  const [chAud, setChAud] = useState("all");
  const [chRunning, setChRunning] = useState([]);
  const [remindModal, setRemindModal] = useState(null);
  const [remindBusy, setRemindBusy] = useState(false);
  const [rosterModal, setRosterModal] = useState(null);
  const [programModalTarget, setProgramModalTarget] = useState(null);
  const [progressModalKey, setProgressModalKey] = useState(null);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [monthPayments, setMonthPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef(null);

  const champMonthOptions = liveCommunity ? (liveLeaderboard?.months || []) : [];
  const champ = liveCommunity
    ? {
        label: liveLeaderboard?.monthLabel || champMonthOptions[0]?.label || "",
        champion: liveLeaderboard?.rows?.[0]?.name || "—",
        score: liveLeaderboard?.rows?.[0]?.score ?? 0,
      }
    : { label: "", champion: "—", score: 0 };
  const maxScore = activeLeaderboard[0]?.score ?? 1;
  const tierData = coachTiers.map((tier) => ({
    label: tier.label === "PWC ONLY" ? "Consultancy only" : tier.label === "HEAL" ? "Heal (paid)" : tier.label === "SEEK" ? "Seek (free)" : "Maintenance",
    value: tier.value,
    color: tier.color,
  }));
  const tierTotal = tierData.reduce((sum, item) => sum + item.value, 0);
  const tierGradient = buildTierGradient(tierData);
  const revenueAnalytics = useMemo(
    () => (canViewRevenue && statisticsForView ? resolveRevenueAnalytics(statisticsForView) : null),
    [canViewRevenue, statisticsForView],
  );
  const revenueUnavailable = canViewRevenue && !revenueAnalytics;
  const fyOptions = useMemo(() => revenueAnalytics?.financialYears || [], [revenueAnalytics]);
  const selectedFy = findFinancialYear(revenueAnalytics, selectedFyStartYear);
  const fyMonths = useMemo(() => selectedFy?.months || [], [selectedFy]);

  useEffect(() => {
    if (!fyOptions.length) return;
    const valid = fyOptions.some((fy) => fy.fyStartYear === selectedFyStartYear);
    if (!valid) {
      setSelectedFyStartYear(revenueAnalytics.currentFyStartYear ?? fyOptions[0].fyStartYear);
    }
  }, [fyOptions, selectedFyStartYear, revenueAnalytics]);

  useEffect(() => {
    if (!fyMonths.length) return;
    if (fyMonths.some((row) => row.month === selectedMonthKey)) return;
    const preferred = fyMonths.find((row) => row.month === revenueAnalytics?.currentMonth) || fyMonths.at(-1);
    if (preferred) setSelectedMonthKey(preferred.month);
  }, [fyMonths, selectedMonthKey, revenueAnalytics]);

  useEffect(() => {
    if (!fyMonths.length) return;
    const valid = productMonthKey === "all" || fyMonths.some((row) => row.month === productMonthKey);
    if (valid) return;
    setProductMonthKey(selectedMonthKey || fyMonths.at(-1)?.month || "all");
  }, [fyMonths, productMonthKey, selectedMonthKey]);

  useEffect(() => {
    const month = liveLeaderboard?.monthYear;
    if (month) setChampMonth(month);
  }, [liveLeaderboard?.monthYear]);

  const selectedMonthRow = fyMonths.find((row) => row.month === selectedMonthKey) || fyMonths.at(-1) || null;
  const previousMonthRow = selectedMonthRow
    ? fyMonths[fyMonths.findIndex((row) => row.month === selectedMonthRow.month) - 1] || null
    : null;
  const revenueDelta = previousMonthRow?.total
    ? Math.round(((asNumber(selectedMonthRow?.total) - asNumber(previousMonthRow.total)) / asNumber(previousMonthRow.total)) * 100)
    : 0;
  const revenueHero = {
    total: formatRevenue(revenueAnalytics?.totalRevenue),
    scope: `All time · till ${revenueAnalytics?.asOfLabel || "today"}`,
    monthLabel: selectedMonthRow?.displayLabel || "This month",
    monthValue: formatRevenue(selectedMonthRow?.total),
    delta: `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}%`,
    deltaUp: revenueDelta >= 0,
  };
  const dynamicRevenueCards = [
    ...(revenueAnalytics?.products || []).map((row) => ({
      label: row.name,
      value: formatRevenue(row.value),
      share: `${asNumber(row.pct)}% of total`,
      pct: asNumber(row.pct),
      color: row.color || PRODUCT_COLORS[row.key] || PRODUCT_COLORS.program,
    })),
    {
      label: "Avg. per client",
      value: formatRevenue(revenueAnalytics?.avgPerClient),
      share: null,
      pct: 0,
      color: PRODUCT_COLORS.avg,
      isAvg: true,
    },
  ];
  const trendMax = Math.max(
    1,
    ...fyMonths.flatMap((row) => [asNumber(row.program), asNumber(row.consultancy)]),
  );
  const revenueTrend = fyMonths.map((row) => ({
    month: row.month,
    label: row.label,
    total: formatRevenue(row.total),
    progHeight: Math.round((asNumber(row.program) / trendMax) * 100),
    consHeight: Math.round((asNumber(row.consultancy) / trendMax) * 100),
    active: row.month === selectedMonthRow?.month,
  }));
  const productMonthRow = fyMonths.find((row) => row.month === productMonthKey);
  const fyProductTotals = fyMonths.reduce(
    (acc, row) => {
      acc.program += asNumber(row.program);
      acc.consultancy += asNumber(row.consultancy);
      acc.app += asNumber(row.app);
      return acc;
    },
    { program: 0, consultancy: 0, app: 0 },
  );
  const fyProductTotal = fyProductTotals.program + fyProductTotals.consultancy + fyProductTotals.app;
  const productSource = productMonthKey === "all"
    ? {
      products: [
        { key: "program", name: "Wellness programs", value: fyProductTotals.program, pct: fyProductTotal ? Math.round((fyProductTotals.program / fyProductTotal) * 100) : 0, color: PRODUCT_COLORS.program },
        { key: "app", name: "App users", value: fyProductTotals.app, pct: fyProductTotal ? Math.round((fyProductTotals.app / fyProductTotal) * 100) : 0, color: PRODUCT_COLORS.app },
        { key: "consultancy", name: "PWC", value: fyProductTotals.consultancy, pct: fyProductTotal ? Math.round((fyProductTotals.consultancy / fyProductTotal) * 100) : 0, color: PRODUCT_COLORS.consultancy },
      ],
    }
    : { products: productMonthRow?.products || selectedMonthRow?.products || [] };
  const productBarOrder = { program: 0, app: 1, consultancy: 2 };
  const productBars = [...(productSource.products || [])]
    .sort((a, b) => (productBarOrder[a.key] ?? 9) - (productBarOrder[b.key] ?? 9))
    .map((row) => ({
      label: row.name,
      value: formatRevenue(row.value),
      pct: asNumber(row.pct),
      color: row.color || PRODUCT_COLORS[row.key] || PRODUCT_COLORS.program,
    }));
  const onboardRows = selectedFy?.onboarded || [];
  const onboardMax = Math.max(1, ...onboardRows.map((row) => asNumber(row.count)));
  const onboardTotal = asNumber(selectedFy?.onboardedTotal);
  const champPodium = activeLeaderboard.slice(0, 3);

  function openBroadcastReview() {
    setBroadcastModalOpen(true);
  }

  function handleBroadcastClick() {
    if (broadcast.trim()) {
      confirmBroadcast();
      return;
    }
    openBroadcastReview();
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
    if (filters.subscriptionExpiryDays) {
      params.set("subscriptionExpiry", String(filters.subscriptionExpiryDays));
    }
    const qs = params.toString();
    navigate(`${UPDATED_ADMIN_PATHS.users}${qs ? `?${qs}` : ""}`);
  }

  function openTeamRemind(payload) {
    const defaultMessage = payload?.defaultMessage ?? "";
    setRemindModal({
      ...payload,
      defaultMessage,
      message: payload?.message ?? defaultMessage,
    });
  }

  async function handleRemindPush() {
    if (!remindModal || remindBusy) return;

    if (remindModal.kind === "onboarding") {
      if (!remindModal.userId) {
        onToast("Cannot send reminder — client id is missing");
        return;
      }
      const message = String(remindModal.message || "").trim();
      if (!message) {
        onToast("Write a reminder message first");
        return;
      }
      setRemindBusy(true);
      try {
        const data = await pushOnboardingReminder(remindModal.userId, {
          message,
          stepLabel: remindModal.stepLabel,
        });
        const first = String(remindModal.recipients?.[0] || "client").split(" ")[0];
        onToast(data?.message || `Reminder pushed to ${first}'s app`);
        setRemindModal(null);
      } catch (err) {
        onToast(err?.message || "Failed to push reminder");
      } finally {
        setRemindBusy(false);
      }
      return;
    }

    const accountIds = Array.isArray(remindModal.accountIds) ? remindModal.accountIds : [];
    const message = String(remindModal.message || "").trim();
    if (!message) {
      onToast("Write a reminder message first");
      return;
    }
    if (!accountIds.length) {
      onToast("No team members to notify");
      return;
    }

    setRemindBusy(true);
    try {
      const data = await sendTeamReminder({ accountIds, message });
      onToast(data?.message || `Notification sent to ${accountIds.length} recipient(s)`);
      setRemindModal(null);
    } catch (err) {
      onToast(err?.message || "Failed to send notification");
    } finally {
      setRemindBusy(false);
    }
  }

  function isActiveTeamMember(member) {
    if (!member?.id) return false;
    if (String(member.status || "").toLowerCase() === "inactive") return false;
    return String(member.displayStatus || "").toLowerCase() !== "pending";
  }

  async function openRemindAll(team) {
    const consoleRoleId = team?.consoleRoleId;
    const roleId = team?.roleId;
    const staff = TEAM_STAFF[roleId];
    const defaultMessage = staff?.defaultRemindMessage || DEFAULT_REMIND_MESSAGE;
    const title = staff?.defaultRemindAllTitle || "Remind everyone";
    const rosterTitle = staff?.rosterTitle || team?.label || "Team";

    const remindKey = String(consoleRoleId || roleId || team?.label || "team");
    openTeamRemind({
      kind: "team",
      remindKey,
      title,
      subtitle: remindSubtitle(rosterTitle, 0),
      recipients: [],
      accountIds: [],
      defaultMessage,
      recipientsLoading: true,
      consoleRoleId,
    });

    try {
      const data = await fetchTeamMembers({
        consoleRoleId: consoleRoleId || undefined,
        roleKey: !consoleRoleId ? roleId : undefined,
        page: 1,
        limit: 200,
      });
      const members = (data?.members || []).filter(isActiveTeamMember);
      setRemindModal((prev) => {
        if (!prev || prev.kind !== "team" || prev.remindKey !== remindKey) return prev;
        return {
          ...prev,
          recipients: members.map((row) => row.name),
          accountIds: members.map((row) => row.id),
          subtitle: remindSubtitle(rosterTitle, members.length),
          recipientsLoading: false,
        };
      });
    } catch (err) {
      setRemindModal((prev) => {
        if (!prev || prev.remindKey !== remindKey) return prev;
        return null;
      });
      onToast(err?.message || "Could not load team members");
    }
  }

  async function openTeamRoster(team) {
    const consoleRoleId = team?.consoleRoleId;
    const roleId = team?.roleId;
    const staff = TEAM_STAFF[roleId];
    const rosterKey = String(consoleRoleId || roleId || team?.label || "team");

    setRosterModal({
      key: rosterKey,
      team,
      title: staff?.rosterTitle || `Total ${team?.label || "team"}`,
      sectionTitle: staff?.sectionTitle || team?.label || "",
      rows: [],
      loading: true,
    });

    try {
      const data = await fetchTeamMembers({
        consoleRoleId: consoleRoleId || undefined,
        roleKey: !consoleRoleId ? roleId : undefined,
        page: 1,
        limit: 200,
      });
      const members = (data?.members || []).filter(isActiveTeamMember);
      setRosterModal((prev) => {
        if (!prev || prev.key !== rosterKey) return prev;
        return {
          ...prev,
          loading: false,
          rows: members.map((row) => ({
            id: row.id,
            name: row.name || "Team member",
            detail: row.meta || "",
          })),
        };
      });
    } catch (err) {
      setRosterModal((prev) => {
        if (!prev || prev.key !== rosterKey) return prev;
        return null;
      });
      onToast(err?.message || "Could not load team members");
    }
  }

  function openRosterRemindOne(row) {
    const name = row?.name || "team member";
    const defaultMessage = staffRemindMessage(name);
    const roleLabel = rosterModal?.sectionTitle || rosterModal?.team?.label || "Team";
    openTeamRemind({
      kind: "team",
      title: `Remind ${name}`,
      subtitle: [roleLabel, row?.detail].filter(Boolean).join(" · "),
      recipients: [name],
      accountIds: row?.id ? [row.id] : [],
      defaultMessage,
    });
  }

  const programModal = useMemo(() => {
    if (!programModalTarget) return null;
    const { key, label, registeredToday, icon } = programModalTarget;
    if (registeredToday) {
      // AppUser card: every user who registered today (IST), any health concern.
      return {
        label: label || APP_USER_PROG_CARD.label,
        icon: icon || APP_USER_PROG_CARD.icon,
        rows: registeredTodayRows || [],
        registeredToday: true,
      };
    }
    // Live clients only — never fall back to seed/mock program lists.
    const rows = clientsByConcern
      ? (clientsByConcern.get(concernKey(key)) ?? clientsByConcern.get(concernKey(label)) ?? [])
      : [];
    return { label, icon, rows };
  }, [clientsByConcern, registeredTodayRows, programModalTarget]);
  const progressModal = liveProgress
    ? buildLiveProgressModal(progressModalKey, liveProgress)
    : null;

  function openProgramCategory(card) {
    const key = card?.modalKey || card?.label;
    const label = card?.modalLabel || card?.label;
    if (!key && !label) return;
    const registeredToday = Boolean(card?.registeredToday);
    if (!clientsByConcern && !registeredToday) {
      onToast("Client list unavailable — live roster did not load.");
      return;
    }
    setProgramModalTarget({
      key,
      label,
      icon: card?.icon || "",
      registeredToday,
    });
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
    if (!liveProgress) {
      onToast("Program progress data is unavailable right now.");
      return;
    }
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

  function openPaymentClient(row) {
    setPaymentsModalOpen(false);
    if (row.userId) {
      navigate(UPDATED_ADMIN_PATHS.userDetail(row.userId));
      return;
    }
    onToast(`Opening profile for ${row.userName}`);
  }

  function openLeaderboardClient(row) {
    if (row?.userId) {
      navigate(UPDATED_ADMIN_PATHS.userDetail(row.userId));
      return;
    }
    onToast(`Opening profile for ${row?.name || "client"}`);
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

  async function exportDashboard() {
    if (exporting || loading || loadError) return;
    const node = pageRef.current;
    if (!node) {
      onToast("Nothing to export");
      return;
    }
    setExporting(true);
    onToast("Capturing dashboard…");
    try {
      const blob = await capturePageScreenshot(node);
      downloadBlob(`dashboard-${new Date().toISOString().slice(0, 10)}.png`, blob);
      onToast("Dashboard screenshot saved");
    } catch (err) {
      console.error("Dashboard export failed", err);
      onToast("Could not capture screenshot");
    } finally {
      setExporting(false);
    }
  }

  const exportButton = canExport ? (
    <button
      type="button"
      className={`btn btn--outline ua-dash-export${exporting ? " ua-dash-export--busy" : ""}`}
      aria-label={exporting ? "Exporting dashboard" : "Export dashboard"}
      title="Export dashboard"
      disabled={exporting || loading || refreshing || Boolean(loadError)}
      onClick={exportDashboard}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
      {exporting ? "Capturing…" : "Export report"}
    </button>
  ) : null;

  function renderDashboardHead(showUpdated = false) {
    return (
      <div className="page-head page-head--dashboard">
        <div className="page-head__intro">
          <div className="page-head__title-row">
            <h1 className="page-head__title">Dashboard</h1>
            <button
              type="button"
              className={`ua-dash-refresh${refreshing ? " ua-dash-refresh--spinning" : ""}`}
              aria-label={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}
              title={refreshing ? "Refreshing…" : "Refresh dashboard"}
              disabled={loading || refreshing || !onRefresh}
              onClick={onRefresh}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
          <div className="page-head__meta">
            <span className="chip chip--scope">{scopeLabel}</span>
            {showUpdated ? (
              <>
                <span className="page-head__meta-sep" aria-hidden="true">·</span>
                <span className="page-head__meta-text">{updatedLabel}</span>
              </>
            ) : null}
          </div>
        </div>
        {exportButton ? <div className="page-head__actions">{exportButton}</div> : null}
      </div>
    );
  }

  if (loading) {
    return (
      <main ref={pageRef} className="content ua-page-enter">
        {renderDashboardHead(false)}
        <BrandLoader variant="page" label="Loading dashboard…" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main ref={pageRef} className="content ua-page-enter">
        {renderDashboardHead(false)}
        <div className="ua-users-empty">
          <div className="ua-users-empty__title">Couldn’t load dashboard</div>
          <p className="ua-users-empty__sub">{loadError}</p>
          <button type="button" className="btn btn--outline" onClick={onRetry}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main ref={pageRef} className={`content ua-page-enter${refreshing ? " ua-dash-page--refreshing" : ""}`}>
      {renderDashboardHead(true)}

      {canViewRevenue && revenueUnavailable ? (
        <div className="ua-dash-data-banner" role="status">
          <strong>Revenue data unavailable.</strong>
          {" "}
          Live analytics did not load from the API. Totals are not shown — sample figures are never used.
        </div>
      ) : null}

      {!statisticsForView && isFullDash ? (
        <div className="ua-dash-data-banner ua-dash-data-banner--muted" role="status">
          <strong>Live dashboard metrics unavailable.</strong>
          {" "}
          User and progress cards show zeros until statistics load successfully.
        </div>
      ) : null}

      {isSupportDash ? (
        <section className="section">
          <div className="ua-section-label">
            <div className="ua-section-label__title">Quick insights</div>
            <span className="ua-section-label__hint">Jump to Configs · live counts not wired yet</span>
          </div>
          <div className="insights-row">
            {SUPPORT_QUICK_INSIGHTS.map((item) => (
              <QuickInsightCard
                key={item.label}
                item={{ ...item, value: "—", sub: "Live count unavailable" }}
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
                      <span className="tier-cell__name">{t.label}</span>
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
                <span className="expiry-card__title">{`Expiring in ${expWindowDays} days`}</span>
                <span className="expiry-card__total">
                  {`${expTotal} total`}
                </span>
              </div>
              <div className="expiry-card__cells">
                {EXP_CARDS.map((e) => (
                  <button
                    key={e.label}
                    type="button"
                    className="expiry-cell cdact"
                    onClick={() => goUsers({ subscriptionExpiryDays: expWindowDays })}
                  >
                    <span className="expiry-cell__label">
                      <span className="expiry-cell__dot expiry-cell__dot--pulse" style={{ background: e.color }} />
                      {e.label}
                    </span>
                    <span className="expiry-cell__value">
                      <span style={{ color: "black" }}>{expTotal}</span>
                      <span className="expiry-cell__sub">
                        {expSubLabel}
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
        <section className="section" >
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
                          {cell.people.map((person, personIdx) => (
                            <span
                              key={`${cell.id}-${person.userId || person.name || "person"}-${personIdx}`}
                              className="ptile__person"
                            >
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
              <div style={{display:'none'}} className="coach-pending-notes">
                <NotesToRemember onToast={onToast} />
              </div>

            </div>


          </div>
        </section>
      ) : null}
      {isFullDash && !isStaffDash ? (
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Program categories : clients</h2>
          <span className="section__hint">Clients registered per program · tap to see who</span>
        </div>
        <div className="prog-cats prog-cats--v2">
          <div className="prog-cats__main">
            <div className="prog-cats__scroll">
              {programCards.map((p, index) => (
                <button
                  key={p.id || p.value || `${p.label}-${index}`}
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
              <span className="prog-cats__appuser-tag">Today</span>
            </div>
            <button
              type="button"
              className="prog-cat prog-cat--appuser"
              style={{ background: appUserProgramCard.bg, borderColor: appUserProgramCard.border }}
              onClick={() => openProgramCategory(appUserProgramCard)}
            >
              <span className="prog-cat__icon" style={{ background: "#fff" }}>
                <CategoryIcon icon={appUserProgramCard.icon} />
              </span>
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
              {programCards.map((p, index) => (
                <button
                  key={p.id || p.value || `${p.label}-${index}`}
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
              <span className="prog-cats__appuser-tag">Today</span>
            </div>
            <button
              type="button"
              className="prog-cat prog-cat--appuser"
              style={{ background: appUserProgramCard.bg, borderColor: appUserProgramCard.border }}
              onClick={() => openProgramCategory(appUserProgramCard)}
            >
              <span className="prog-cat__icon" style={{ background: "#fff" }}>
                <CategoryIcon icon={appUserProgramCard.icon} />
              </span>
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
                      <span className="ops-tile__count" style={{ color: "black" }}>{cell.count}</span>
                      <span className="ops-tile__chip">{cell.chip}</span>
                    </span>
                    <span className="ops-tile__tip" role="tooltip">
                      <span className="ops-tile__tip-title">{cell.tipTitle}</span>
                      {(cell.people || []).map((person, personIdx) => (
                        <span
                          key={`${cell.id}-${person.userId || person.name || "person"}-${personIdx}`}
                          className="ops-tile__person"
                        >
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
            <button type="button" className="community-card__send" onClick={handleBroadcastClick}>
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
                    {champClients.length === 0 ? (
                      <div className="community-card__empty">No client champions yet</div>
                    ) : champClients.map((c) => (
                      <div key={c.id || c.name} className="champion-mini">
                        <span className="champion-mini__name">{c.name}</span>
                        <span className="champion-mini__score">{c.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="champion-split__col">
                  <div className="champion-split__label champion-split__label--muted">Wellness coach</div>
                  <div className="champion-scroll champion-scroll--plain">
                    {champCoaches.length === 0 ? (
                      <div className="community-card__empty">No coach champion yet</div>
                    ) : (
                      <div key={champCoaches[0].id || champCoaches[0].name} className="champion-mini champion-mini--plain">
                        <span className="champion-mini__name">{champCoaches[0].name}</span>
                        <span className="champion-mini__score">{champCoaches[0].score}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="community-card community-card--birthday">
            <div className="community-card__head"><span>🎂</span> Birthdays</div>
            <div className="birthday-scroll">
              {birthdayRows.length === 0 ? (
                <div className="community-card__empty">No upcoming birthdays</div>
              ) : birthdayRows.map((b) => (
                <div key={b.id || `${b.name}-${b.when}`} className={`birthday-chip${b.isCoach ? " birthday-chip--coach" : ""}`}>
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
            {teamCards.length === 0 ? (
              <div className="community-card__empty" style={{ padding: "18px 8px" }}>
                No team roles yet. Create a role in Access Control to see it here.
              </div>
            ) : null}
            {teamCards.map((team) => (
              <div key={team.consoleRoleId || team.roleId || team.label} className="team-card cdact">
                <span className="stat-card__bar" style={{ background: team.bar }} />
                <div className="stat-card__top">
                  <span className="stat-card__icon" style={{ background: team.bar, color: "#fff", boxShadow: `0 2px 6px ${team.bar}55` }}>
                    <StatIcon name="users" />
                  </span>
                  <span className="stat-card__label">{team.label}</span>
                </div>
                <div className="stat-card__value" >{team.value}</div>
                <div className="team-card__tags">
                  {(team.pending || []).map((tag) => (
                    <span key={tag.label} className="tag" style={{ background: tag.bg, color: tag.color, borderColor: tag.color }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="team-card__actions">
                  <button
                    type="button"
                    className="team-card__view"
                    onClick={() => openTeamRoster(team)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="team-card__bell"
                    title="Send reminder"
                    onClick={() => openRemindAll(team)}
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
          {champMonthOptions.length ? (
            <select
              className="header__select"
              aria-label="Champion month"
              value={champMonth}
              onChange={(e) => setChampMonth(e.target.value)}
            >
              {champMonthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : null}
        </div>

        {!champExpanded ? (
          <div className="leaderboard__podium">
            {champPodium.length === 0 ? (
              <div className="community-card__empty">No reflection scores for this month yet</div>
            ) : champPodium.map((row, i) => (
              <div
                key={row.rank || row.userId || row.name}
                className={`podium-card podium-card--${i + 1}`}
                onClick={() => openLeaderboardClient(row)}
                onKeyDown={(e) => e.key === "Enter" && openLeaderboardClient(row)}
                role="button"
                tabIndex={0}
              >
                <span className={`podium-card__rank ${row.rank === 1 ? "rank--1" : row.rank === 2 ? "rank--2" : "rank--3"}`}>{row.rank === 1 ? "1" : row.rank === 2 ? "2" : "3"}</span>
                <div className="podium-card__info">
                  <div className="podium-card__name">{row.name}</div>
                  <div className="podium-card__sub">{row.days} days active</div>
                </div>
                <span className="podium-card__score">{row.score}</span>
              </div>
            ))}
          </div>
        ) : activeLeaderboard.length === 0 ? (
          <div className="community-card__empty">No reflection scores for this month yet</div>
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
                <div className="leaderboard__hero-label">DRF score</div>
              </div>
            </div>

           
            <div className="leaderboard__rows leaderboard__rows--compact">
            <div className="leaderboard__table-head">
              <div>#</div><div>Clients</div><div>Score</div><div>Days</div>
            </div>
              {activeLeaderboard.map((row, rowIdx) => (
                <div style={{border:"1px solid rgb(242, 214, 117)"}}
                  key={`${row.userId || row.name || "row"}-${row.rank ?? rowIdx}`}
                  className={`leaderboard__row${row.highlight ? " leaderboard__row--highlight" : ""}`}
                  onClick={() => openLeaderboardClient(row)}
                  onKeyDown={(e) => e.key === "Enter" && openLeaderboardClient(row)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="leaderboard__rank podium-card__rank rank--1">{row.rank}</span>
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
              ⚙️ Ranked from Daily Reflection totals this month · {champ.label} · {activeLeaderboard.length} client{activeLeaderboard.length === 1 ? "" : "s"}
            </p>
          </>
        )}
      </section>

      {canViewRevenue ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Revenue Analytics</h2>
              <span className="section__hint">
                {revenueUnavailable
                  ? "Unavailable · live API required"
                  : `Overall · till ${revenueAnalytics?.asOfLabel || "today"}`}
              </span>
            </div>
            {revenueUnavailable ? (
              <div className="ua-dash-revenue-empty">
                <div className="ua-dash-revenue-empty__title">Revenue data unavailable</div>
                <p className="ua-dash-revenue-empty__sub">
                  The API did not return revenue analytics for this session. Demo numbers are not shown.
                </p>
                {onRetry ? (
                  <button type="button" className="btn btn--outline" onClick={onRetry}>
                    Retry dashboard
                  </button>
                ) : null}
              </div>
            ) : (
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
            )}
          </section>

          {!revenueUnavailable ? (
          <section className="section">
            <div className="section__head section__head--charts">
              <h2 className="section__title">Financial year · Apr → Mar</h2>
              <div className="chart-controls">
                <button
                  type="button"
                  className="btn btn--soft"
                  onClick={() => setPaymentsModalOpen(true)}
                >
                  <span className="chart-controls__pay-icon" aria-hidden="true">💳</span>
                  View payments
                </button>
                <select
                  className="header__select"
                  aria-label="Financial year"
                  value={selectedFyStartYear ?? ""}
                  onChange={(e) => {
                    setSelectedFyStartYear(Number(e.target.value));
                    setSelectedMonthKey(null);
                    setProductMonthKey(null);
                  }}
                >
                  {fyOptions.map((fy) => (
                    <option key={fy.fyStartYear} value={fy.fyStartYear}>{fy.label}</option>
                  ))}
                </select>
                <select
                  className="header__select"
                  aria-label="Month"
                  value={selectedMonthKey ?? ""}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                >
                  {fyMonths.map((m) => (
                    <option key={m.month} value={m.month}>{m.displayLabel}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card__head">
                  <div>
                    <div className="chart-card__title">Revenue trend</div>
                    <div className="chart-card__sub">{selectedFy?.label || "Financial year"} · Apr → Mar · tap a month</div>
                  </div>
                  <div className="chart-legend">
                    <span><i className="dot dot--green" /> Program</span>
                    <span><i className="dot dot--purple" /> Consultancy</span>
                  </div>
                </div>
                <div className="bar-chart bar-chart--dual">
                  {revenueTrend.length ? revenueTrend.map((m) => (
                    <button
                      key={m.month}
                      type="button"
                      className="bar-group"
                      style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                      onClick={() => {
                        setSelectedMonthKey(m.month);
                        setProductMonthKey(m.month);
                      }}
                    >
                      <span className="bar-group__total">{m.total}</span>
                      <div className="bar-group__bars">
                        <div className={`bar bar--prog-${m.active ? "active" : "light"}`} style={{ height: `${m.progHeight}%` }} />
                        <div className={`bar bar--cons-${m.active ? "active" : "light"}`} style={{ height: `${m.consHeight}%` }} />
                      </div>
                      <span className={`bar-group__label${m.active ? " bar-group__label--active" : ""}`}>{m.label}</span>
                    </button>
                  )) : (
                    <p className="product-bars__empty">No revenue in this financial year yet.</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card__head">
                  <div>
                    <div className="chart-card__title">Revenue by product</div>
                    <div className="chart-card__sub">
                      {productMonthKey === "all"
                        ? `${selectedFy?.label || "Full year"} · all months`
                        : productMonthRow?.displayLabel || selectedMonthRow?.displayLabel}
                    </div>
                  </div>
                  <select
                    className="header__select chart-card__product-select"
                    aria-label="Revenue by product period"
                    value={productMonthKey ?? ""}
                    onChange={(e) => setProductMonthKey(e.target.value)}
                  >
                    <option value="all">{selectedFy?.label || "Full year"}</option>
                    {fyMonths.map((m) => (
                      <option key={m.month} value={m.month}>{m.displayLabel}</option>
                    ))}
                  </select>
                </div>
                <div className="product-bars">
                  {productBars.length ? productBars.map((p) => (
                    <div key={p.label}>
                      <div className="product-bar__head">
                        <span className="product-bar__label">{p.label}</span>
                        <span className="product-bar__value">{p.value}</span>
                      </div>
                      <div className="product-bar__track">
                        <div
                          className="product-bar__fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, p.pct))}%`,
                            background: p.color === "#2b8f5b" ? GRADIENT_GREEN : p.color,
                          }}
                        />
                      </div>
                      <div className="product-bar__pct">
                        {p.pct}% of {productMonthKey === "all" ? "year" : "month"}
                      </div>
                    </div>
                  )) : (
                    <p className="product-bars__empty">No product revenue for this period.</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card__head">
                  <div>
                    <div className="chart-card__title">Users onboarded</div>
                    <div className="chart-card__sub">{selectedFy?.label || "Financial year"} · Apr → Mar</div>
                  </div>
                  <span className="badge badge--green">{onboardTotal} in {selectedFy?.label || "this FY"}</span>
                </div>
                <div className="bar-chart bar-chart--single">
                  {onboardRows.map((m) => (
                    <button
                      key={m.month}
                      type="button"
                      className="bar-group"
                      style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                      onClick={() => {
                        setSelectedMonthKey(m.month);
                        setProductMonthKey(m.month);
                      }}
                    >
                      <span className="bar-group__total">{m.count}</span>
                      <div className="bar-group__bars">
                        <div
                          className={`bar onboard bar--onboard-${m.month === selectedMonthKey ? "active" : "light"}`}
                          style={{ height: `${Math.round((asNumber(m.count) / onboardMax) * 100)}%`, width: "55%" }}
                        />
                      </div>
                      <span className={`bar-group__label${m.month === selectedMonthKey ? " bar-group__label--active" : ""}`}>{m.label}</span>
                    </button>
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
          ) : null}
        </>
      ) : null}

      <ProgramCategoryModal
        open={!!programModal}
        program={programModal}
        onClose={() => setProgramModalTarget(null)}
        onOpenClient={openProgramClient}
      />

      <PaymentsModal
        open={paymentsModalOpen}
        monthKey={selectedMonthKey}
        monthLabel={selectedMonthRow?.displayLabel}
        clients={clients}
        healthConcerns={healthConcerns}
        onClose={() => setPaymentsModalOpen(false)}
        onOpenClient={openPaymentClient}
      />

      <ProgramProgressModal
        open={!!progressModal}
        modal={progressModal}
        onClose={() => setProgressModalKey(null)}
        onOpenClient={openProgressClient}
        onRemind={openOnboardingRemind}
      />

      <TeamRosterModal
        open={!!rosterModal}
        title={rosterModal?.title ?? ""}
        sectionTitle={rosterModal?.sectionTitle ?? ""}
        rows={rosterModal?.rows ?? []}
        loading={Boolean(rosterModal?.loading)}
        onClose={() => setRosterModal(null)}
        onRemindAll={() => {
          if (rosterModal?.team) openRemindAll(rosterModal.team);
        }}
        onRemindOne={openRosterRemindOne}
      />

      <TeamRemindModal
        open={!!remindModal}
        title={remindModal?.title ?? ""}
        subtitle={remindModal?.subtitle ?? ""}
        recipients={remindModal?.recipients ?? []}
        recipientsLoading={Boolean(remindModal?.recipientsLoading)}
        message={remindModal?.message ?? ""}
        defaultMessage={remindModal?.defaultMessage ?? ""}
        busy={remindBusy}
        actionLabel={remindModal?.kind === "onboarding" ? "Push to app" : "Send Notification"}
        actionIcon={remindModal?.kind === "onboarding" ? "📱" : "🔔"}
        onMessageChange={(message) => setRemindModal((prev) => (prev ? { ...prev, message } : prev))}
        onReset={() => setRemindModal((prev) => (prev ? { ...prev, message: prev.defaultMessage } : prev))}
        onPush={handleRemindPush}
        onWhatsApp={() => {
          if (remindBusy) return;
          onToast(`WhatsApp sent to ${remindModal?.recipients.length ?? 0} recipient(s)`);
          setRemindModal(null);
        }}
        onClose={() => {
          if (!remindBusy) setRemindModal(null);
        }}
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
