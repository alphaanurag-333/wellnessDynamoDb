import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { CfgSelect, OrangeButton, PageHeader } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { STAFF_AVATARS, TEAM_ROLE_META, staffInitials } from "../data/teamsData.js";
import {
  PERM_ACTS,
  PERM_CATALOG,
  TOTAL_PERM_SLOTS,
  cloneGrants,
} from "../data/accessData.js";
import { fetchAccessCatalog, fetchAccessRoles } from "../api/accessApi.js";
import {
  fetchTeamMember,
  saveTeamMemberPermissions,
  setAccessMemberRole,
  updateTeamMemberProfileImage,
} from "../api/teamsApi.js";
import { accountUpdateMe } from "../api/accountApi.js";
import {
  formatIntroVideoMeta,
  saveCoachIntroLive,
  saveCoachIntroVideo,
  saveCoachLetterLive,
  saveMyIntroLive,
  saveMyIntroVideo,
  saveMyLetterLive,
  validateIntroVideoFile,
} from "../api/coachContentApi.js";
import { resolveBaseUiRoleKey, SYSTEM_TEAM_UI_KEYS } from "../utils/liveRoles.js";
import { parseDateOfBirthIso } from "../utils/personFieldValidation.js";

const PROFILE_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function TeamMemberAvatar({ name, profileImage, background, editable, uploading, onPickPhoto }) {
  const hasPhoto = Boolean(profileImage);
  const actionLabel = uploading
    ? "Uploading profile photo"
    : hasPhoto
      ? "Replace profile photo"
      : "Upload profile photo";

  const editBadge = editable ? (
    <span className="ua-tm-avatar__edit" aria-hidden="true">
      {uploading ? (
        <span className="ua-tm-avatar__spinner" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )}
    </span>
  ) : null;

  if (editable) {
    return (
      <button
        type="button"
        className={`ua-tm-avatar ua-tm-avatar--editable${hasPhoto ? "" : " ua-tm-avatar--initials"}${uploading ? " is-uploading" : ""}`}
        onClick={onPickPhoto}
        disabled={uploading}
        aria-label={actionLabel}
        title={uploading ? "Uploading…" : hasPhoto ? "Replace photo" : "Upload photo"}
      >
        <span
          className="ua-tm-avatar__media"
          style={hasPhoto ? undefined : { background }}
        >
          {hasPhoto ? (
            <img src={profileImage} alt="" />
          ) : (
            staffInitials(name)
          )}
        </span>
        {editBadge}
      </button>
    );
  }

  return (
    <span
      className="ua-tm-avatar"
      style={hasPhoto ? undefined : { background }}
      aria-hidden={hasPhoto ? undefined : true}
    >
      {hasPhoto ? (
        <img src={profileImage} alt="" />
      ) : (
        staffInitials(name)
      )}
    </span>
  );
}

function CaretIcon({ up = false, className = "" }) {
  return (
    <svg
      className={`ua-tm-caret${up ? " ua-tm-caret--up" : ""}${className ? ` ${className}` : ""}`}
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1.5L6 6.5L11 1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContentToggle({ live, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`ua-toggle ua-toggle--sm${live ? " ua-toggle--on" : ""}`}
      aria-pressed={live}
      aria-label={live ? "Live in app" : "Hidden in app"}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="ua-toggle__knob" />
    </button>
  );
}

function ContentRowMoreMenu({ disabled, children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ua-tm-content-more" ref={wrapRef}>
      <button
        type="button"
        className="ua-tm-content-more__btn"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>
      {open ? (
        <div className="ua-tm-content-more__menu" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function downloadContentFile(url, filename) {
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "";
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

function contentDownloadName(item) {
  if (item?.kind === "letter") return "commitment-letter.pdf";
  try {
    const path = new URL(item.downloadUrl).pathname;
    const base = path.split("/").pop();
    if (base && /\.\w+$/.test(base)) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return "intro-video.mp4";
}

const SYSTEM_TEAM_ROLE_KEYS = [...SYSTEM_TEAM_UI_KEYS];

function catalogRowsFromApi(catalog) {
  if (!Array.isArray(catalog?.features) || !catalog.features.length) return PERM_CATALOG;
  return catalog.features.map((feature) => [
    feature.sectionLabel,
    feature.featureName,
    feature.featureId,
    Array.isArray(feature.actions) ? feature.actions : [],
    feature.sectionId,
  ]);
}

function roleChipMeta(role, fallbackKey = "wc") {
  const key = role?.roleKey || fallbackKey;
  const base = TEAM_ROLE_META[key] || TEAM_ROLE_META.wc;
  return {
    name: role?.name || base.name,
    roleColor: role?.color || base.roleColor,
    roleBg: role?.bg || base.roleBg,
    roleBorder: role?.bd || base.roleBorder,
  };
}

const NAME_DISPLAY_LIMIT = 12;

function shortDisplayName(name, max = NAME_DISPLAY_LIMIT) {
  const text = String(name || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return { short: text, full: text, truncated: false };
  return {
    short: `${text.slice(0, max)}…`,
    full: text,
    truncated: true,
  };
}

function memberHas(grants, featureId, action) {
  if (grants == null) return true;
  return Boolean(grants?.[featureId]?.includes(action));
}

function countMemberGranted(grants, catalog = PERM_CATALOG) {
  let n = 0;
  for (const row of catalog) {
    for (const act of row[3]) {
      if (memberHas(grants, row[2], act)) n += 1;
    }
  }
  return n;
}

function featureOnCount(grants, featureId, actions) {
  return actions.filter((a) => memberHas(grants, featureId, a)).length;
}

function toggleMemberGrant(grants, featureId, action, catalog = PERM_CATALOG) {
  const next =
    grants == null
      ? (() => {
          const all = {};
          for (const row of catalog) all[row[2]] = [...row[3]];
          return all;
        })()
      : cloneGrants({ m: grants }).m;

  const set = new Set(next[featureId] || []);
  if (set.has(action)) set.delete(action);
  else set.add(action);
  const allowed = catalog.find((r) => r[2] === featureId)?.[3] || [];
  const ordered = allowed.filter((a) => set.has(a));
  if (ordered.length) next[featureId] = ordered;
  else delete next[featureId];
  return next;
}

function applyChangeToGrants(grants, change, roleGrants, catalog = PERM_CATALOG) {
  if (change.reset) return roleGrants == null ? null : { ...roleGrants };

  let next = grants == null ? null : { ...grants };
  if (next == null) next = roleGrants == null ? null : { ...roleGrants };
  if (!next || !change.featureId) return next;

  const row = catalog.find((r) => r[2] === change.featureId);
  const allowed = row?.[3] || [];
  const set = new Set(next[change.featureId] || []);
  if (change.changeType === "grant") set.add(change.action);
  else if (change.changeType === "revoke") set.delete(change.action);
  const ordered = allowed.filter((a) => set.has(a));
  if (ordered.length) next[change.featureId] = ordered;
  else delete next[change.featureId];
  return next;
}

function memberPendingRequests(member) {
  if (Array.isArray(member?.pendingPermissionRequests) && member.pendingPermissionRequests.length) {
    return member.pendingPermissionRequests.filter((req) => req.status === "pending");
  }
  if (member?.pendingPermissionRequest?.status === "pending") {
    return [member.pendingPermissionRequest];
  }
  return [];
}

function editorGrants(member, usePending, catalog = PERM_CATALOG) {
  let grants = member?.grants == null ? null : { ...member.grants };
  if (!usePending) return grants;

  const pending = memberPendingRequests(member);
  for (const req of [...pending].reverse()) {
    grants = applyChangeToGrants(grants, req, member.roleGrants, catalog);
  }
  return grants;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatProfileDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMemberDob(value) {
  const iso = parseDateOfBirthIso(value);
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function memberBio(member) {
  const text = String(member?.bio || "").trim();
  return text || "—";
}

function memberLocation(member) {
  return [member.city, member.state, member.country].filter(Boolean).join(", ") || "—";
}

function memberPhone(member) {
  if (!member.phone) return "—";
  const prefix = member.phoneCountryCode ? `+${String(member.phoneCountryCode).replace(/^\+/, "")} ` : "";
  return `${prefix}${member.phone}`;
}

function ToggleSwitch({ on, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`ua-ac-switch ua-ac-switch--${on ? "on" : "off"}${disabled ? " ua-ac-switch--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <span className="ua-ac-switch__knob" />
    </button>
  );
}

function buildClientCards(member) {
  const total = member.clientStats?.total ?? member.clientCount ?? 0;
  const seek = member.clientStats?.seek ?? 0;
  const heal = member.clientStats?.heal ?? 0;
  const pwc = member.clientStats?.consultancy_only ?? 0;
  const maintenance = member.clientStats?.maintenance ?? 0;
  const other = member.clientStats?.other ?? 0;
  const awc = member.awcCount ?? 0;
  const share = (part) => (total ? pct(part, total) : null);

  return [
    { key: "total", label: "Total users", count: total, pct: null, bar: 100, sub: "All assigned", tone: "blue" },
    { key: "seek", label: "Seek users", count: seek, pct: share(seek), bar: share(seek) || 0, sub: "Free tier", tone: "amber" },
    { key: "heal", label: "Heal users", count: heal, pct: share(heal), bar: share(heal) || 0, sub: "Paid programs", tone: "green" },
    { key: "other", label: "Eagles", count: other, pct: share(other), bar: share(other) || 0, sub: "Corporate & family", tone: "purple" },
    { key: "maintenance", label: "Maintenance", count: maintenance, pct: share(maintenance), bar: share(maintenance) || 0, sub: "Post-heal upkeep", tone: "orange" },
    { key: "pwc", label: "PWC", count: pwc, pct: share(pwc), bar: share(pwc) || 0, sub: "Consults booked", tone: "navy" },
    { key: "awc", label: "AWCs", count: awc, pct: total ? pct(awc, total) : null, bar: total ? pct(awc, total) : 0, sub: "Assistant coaches", tone: "ink" },
  ];
}

export function TeamMemberPage() {
  const { memberId } = useParams();
  const [searchParams] = useSearchParams();
  const { showToast: onToast } = useOutletContext();
  const { account, isSuperAdmin, isAdminView, viewAs, sessionUi, can } = useViewAs();
  const navigate = useNavigate();
  const permsRef = useRef(null);
  const videoRef = useRef(null);
  const photoFileRef = useRef(null);
  const actorIsWc = viewAs === "wc" || sessionUi === "wc";
  const requestsApproval = !isSuperAdmin && actorIsWc;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleDraft, setRoleDraft] = useState("wc");
  const [savingRole, setSavingRole] = useState(false);
  const [grants, setGrants] = useState({});
  const [dirtyPerms, setDirtyPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [profileOpen, setProfileOpen] = useState(true);
  const [permsOpen, setPermsOpen] = useState(true);
  const [accessRoles, setAccessRoles] = useState([]);
  const [catalogRows, setCatalogRows] = useState(PERM_CATALOG);
  const [permActs, setPermActs] = useState(PERM_ACTS);
  const [totalSlots, setTotalSlots] = useState(TOTAL_PERM_SLOTS);
  const [contentBusyKey, setContentBusyKey] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const catalogRef = useRef(PERM_CATALOG);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, roles, catalog] = await Promise.all([
        fetchTeamMember(memberId),
        fetchAccessRoles().catch(() => []),
        fetchAccessCatalog().catch(() => null),
      ]);
      if (!m?.id) throw new Error("Member not found");
      const rows = catalogRowsFromApi(catalog);
      catalogRef.current = rows;
      setCatalogRows(rows);
      setPermActs(Array.isArray(catalog?.actions) && catalog.actions.length ? catalog.actions : PERM_ACTS);
      setTotalSlots(Number(catalog?.totalSlots || m?.totalSlots) || TOTAL_PERM_SLOTS);
      setAccessRoles(Array.isArray(roles) ? roles : []);
      setMember(m);
      setRoleDraft(m.consoleRoleId || m.primaryRoleKey || "wc");
      setGrants(editorGrants(m, requestsApproval, rows));
      setDirtyPerms(false);
    } catch (err) {
      setError(err?.message || "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [memberId, requestsApproval]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!member || searchParams.get("focus") !== "permissions") return;
    setPermsOpen(true);
    permsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [member, searchParams]);

  const teamRoles = useMemo(
    () =>
      (accessRoles || []).filter((role) => {
        const baseUiKey = resolveBaseUiRoleKey(role, accessRoles);
        return Boolean(baseUiKey);
      }),
    [accessRoles],
  );
  const activeRole =
    teamRoles.find((role) => role.id === member?.consoleRoleId) ||
    teamRoles.find((role) => role.roleKey === member?.primaryRoleKey) ||
    null;
  const activeBaseUiKey = resolveBaseUiRoleKey(activeRole, teamRoles) || member?.primaryRoleKey;
  const roleMeta = roleChipMeta(activeRole, activeBaseUiKey);
  const granted = countMemberGranted(grants, catalogRows);
  const avatarColor = STAFF_AVATARS[(member?.name?.length || 0) % STAFF_AVATARS.length];
  const targetIsAwc =
    member?.primaryRoleKey === "awc" ||
    member?.accountRoleKey === "assistant_wellness_coach" ||
    activeBaseUiKey === "awc";
  const canEditPerms =
    Boolean(member) &&
    !member.isSuperAdmin &&
    (isSuperAdmin || (requestsApproval && targetIsAwc));

  const matrixGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    for (const row of catalogRows) {
      if (!cur || cur.label !== row[0]) {
        cur = { label: row[0], features: [] };
        groups.push(cur);
      }
      cur.features.push(row);
    }
    return groups;
  }, [catalogRows]);

  const clientCards = useMemo(() => (member ? buildClientCards(member) : []), [member]);

  async function handleSaveRole() {
    if (!member) return;
    const nextRole = roleOptions.find((role) => String(role.id || role.roleKey) === String(roleDraft));
    const currentRoleKey = String(member.consoleRoleId || member.primaryRoleKey || "");
    if (!nextRole || String(roleDraft) === currentRoleKey) return;
    setSavingRole(true);
    try {
      await setAccessMemberRole(member.id, {
        consoleRoleId: nextRole.id,
        roleKey: nextRole.roleKey,
      });
      onToast("Role updated");
      await load();
    } catch (err) {
      onToast(err?.message || "Role update failed");
    } finally {
      setSavingRole(false);
    }
  }

  function handleToggle(featureId, action) {
    if (!canEditPerms) return;
    setGrants((g) => toggleMemberGrant(g, featureId, action, catalogRef.current));
    setDirtyPerms(true);
  }

  async function handleSavePerms() {
    setSavingPerms(true);
    try {
      const updated = await saveTeamMemberPermissions(member.id, { grants });
      setMember(updated);
      setGrants(editorGrants(updated, requestsApproval, catalogRef.current));
      setDirtyPerms(false);
      onToast(
        requestsApproval && memberPendingRequests(updated).length
          ? `Sent ${memberPendingRequests(updated).length} request${
              memberPendingRequests(updated).length === 1 ? "" : "s"
            } to Admin`
          : "Permissions saved",
      );
    } catch (err) {
      onToast(err?.message || "Save failed");
    } finally {
      setSavingPerms(false);
    }
  }

  async function handleResetPerms() {
    setSavingPerms(true);
    try {
      const updated = await saveTeamMemberPermissions(member.id, { reset: true });
      setMember(updated);
      setGrants(editorGrants(updated, requestsApproval, catalogRef.current));
      setDirtyPerms(false);
      onToast(
        requestsApproval && memberPendingRequests(updated).length
          ? "Reset sent to Admin for approval"
          : "Reset to role default",
      );
    } catch (err) {
      onToast(err?.message || "Reset failed");
    } finally {
      setSavingPerms(false);
    }
  }

  const isOwnProfile = Boolean(account?.id && memberId && account.id === memberId);
  const canEditContent = Boolean(isAdminView) || isOwnProfile;
  const canEditPhoto = Boolean(member) && !member.isSuperAdmin && (isSuperAdmin || isOwnProfile || can("console.tm.edit"));

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !member?.id || !canEditPhoto || uploadingPhoto) return;
    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      onToast("Use JPEG, PNG, GIF, or WebP");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      onToast("Profile image must be 25 MB or smaller");
      return;
    }

    const hadPhoto = Boolean(member.profileImage);
    setUploadingPhoto(true);
    try {
      let profileImage = null;
      if (isOwnProfile && !isSuperAdmin) {
        const updated = await accountUpdateMe({}, file);
        profileImage = updated?.profileImage || null;
      } else {
        const updated = await updateTeamMemberProfileImage(member.id, file);
        profileImage = updated?.profileImage || null;
      }
      setMember((current) => (current ? { ...current, profileImage } : current));
      onToast(hadPhoto ? "Profile photo updated" : "Profile photo uploaded");
    } catch (err) {
      onToast(err?.message || "Could not upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function mapContentFromAccount(nextAccount, previous = []) {
    const intro = nextAccount?.coach_content?.intro || {};
    const letter = nextAccount?.coach_content?.letter || {};
    const hasVideo = Boolean(intro.videoUrl || intro.linkUrl);
    const hasLetter = Boolean(letter.fileUrl);
    const prevById = Object.fromEntries((previous || []).map((row) => [row.id, row]));
    return [
      {
        id: "intro",
        kind: "video",
        title: "Intro video",
        live: Boolean(intro.live) && hasVideo,
        hasMedia: hasVideo,
        meta: formatIntroVideoMeta(intro),
        url: intro.videoUrl || intro.linkUrl || null,
        downloadUrl: intro.videoUrl || null,
      },
      {
        id: "letter",
        kind: "letter",
        title: "Commitment letter",
        live: Boolean(letter.live) && hasLetter,
        hasMedia: hasLetter,
        meta: hasLetter
          ? [letter.signedAt ? `Signed ${new Date(letter.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Uploaded", "PDF"]
              .filter(Boolean)
              .join(" · ")
          : prevById.letter?.meta || "Not uploaded",
        url: letter.fileUrl || null,
        downloadUrl: letter.fileUrl || null,
      },
    ];
  }

  async function runContentSave(itemId, work, successMessage) {
    if (!member?.id || contentBusyKey) return;
    setContentBusyKey(itemId);
    try {
      const result = await work();
      const nextAccount = result?.account || result;
      if (nextAccount?.coach_content) {
        setMember((prev) =>
          prev
            ? {
                ...prev,
                content: mapContentFromAccount(nextAccount, prev.content),
              }
            : prev,
        );
      } else {
        await load();
      }
      if (successMessage) onToast(successMessage);
    } catch (err) {
      onToast(err?.message || "Could not update content");
    } finally {
      setContentBusyKey("");
    }
  }

  function toggleContentItem(item) {
    if (!canEditContent) return;
    if (!item.hasMedia) {
      onToast(item.kind === "video" ? "Upload a video before going live" : "Upload a signed letter before going live");
      return;
    }
    const nextLive = !item.live;
    if (item.kind === "video") {
      runContentSave(
        item.id,
        () => (isOwnProfile ? saveMyIntroLive(nextLive) : saveCoachIntroLive(member.id, nextLive)),
        nextLive ? "Intro video is live in the app" : "Intro video is hidden",
      );
      return;
    }
    runContentSave(
      item.id,
      () => (isOwnProfile ? saveMyLetterLive(nextLive) : saveCoachLetterLive(member.id, nextLive)),
      nextLive ? "Commitment letter is live in the app" : "Commitment letter is hidden",
    );
  }

  function startContentUpload(item) {
    if (!canEditContent) return;
    if (item.kind === "letter") {
      navigate(UPDATED_ADMIN_PATHS.commitmentLetters(member.id));
      return;
    }
    videoRef.current?.click();
  }

  function handleIntroVideoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !member?.id) return;
    const invalid = validateIntroVideoFile(file);
    if (invalid) {
      onToast(invalid);
      return;
    }
    runContentSave(
      "intro",
      () => (isOwnProfile ? saveMyIntroVideo(file) : saveCoachIntroVideo(member.id, file)),
      "Intro video uploaded",
    );
  }

  if (loading) {
    return (
      <main className="content ua-page-enter">
        <BrandLoader variant="page" label="Loading member…" />
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="content ua-page-enter">
        <PageHeader title="Team member" backLink="Team" />
        <div className="ua-section-bar">
          <span>{error || "Not found"}</span>
          <OrangeButton onClick={() => navigate(UPDATED_ADMIN_PATHS.teams)}>Back</OrangeButton>
        </div>
      </main>
    );
  }

  const showClients = member.primaryRoleKey === "wc" || member.primaryRoleKey === "awc";
  const contentItems = Array.isArray(member.content) ? member.content : [];
  const contentLive = contentItems.filter((item) => item.live).length;
  const displayName = shortDisplayName(member.name);
  const roleOptions = teamRoles.length
    ? teamRoles
    : SYSTEM_TEAM_ROLE_KEYS.map((id) => ({
        id,
        roleKey: id,
        name: TEAM_ROLE_META[id]?.name || id,
      }));

  return (
    <main className="content ua-page-enter ua-tm-page">
      <div className="ua-tm-top">
        <Link to={UPDATED_ADMIN_PATHS.teams} className="ua-back-link">
        ‹ Back to Team
        </Link>
        <h1 className="page-head__title">Team member</h1>
      </div>

      <section className="ua-tm-card ua-tm-profile">
        <input
          ref={photoFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={handlePhotoSelected}
        />
        <div className="ua-tm-profile__row">
          <div className="ua-tm-profile__identity">
            <TeamMemberAvatar
              name={member.name}
              profileImage={member.profileImage}
              background={avatarColor}
              editable={canEditPhoto}
              uploading={uploadingPhoto}
              onPickPhoto={() => {
                if (!canEditPhoto || uploadingPhoto) return;
                photoFileRef.current?.click();
              }}
            />
            <div className="ua-tm-profile__copy">
              <div className="ua-tm-profile__name-row">
                <h2
                  className="ua-tm-profile__name"
                  title={displayName.truncated ? displayName.full : undefined}
                >
                  {displayName.short}
                </h2>
                <span
                  className="ua-role-chip"
                  style={{
                    background: roleMeta.roleBg,
                    color: roleMeta.roleColor,
                    borderColor: roleMeta.roleBorder,
                  }}
                >
                  {roleMeta.name}
                </span>
                <span
                  className={`ua-status-pill${
                    member.displayStatus === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"
                  }`}
                >
                  {member.displayStatus}
                </span>
              </div>
              <div
                className="ua-tm-profile__meta"
                title={[member.email, member.meta].filter(Boolean).join(" · ") || undefined}
              >
                {member.email}
                {member.meta ? <span> · {member.meta}</span> : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ua-tm-profile__view"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
          >
            {profileOpen ? "Hide profile" : "View profile"}
            <CaretIcon className="ua-tm-profile__chevron" up={profileOpen} />
          </button>
        </div>

        <div className="ua-tm-role-change">
          <div>
            <div className="ua-tm-role-change__label">Role change</div>
            <p className="ua-tm-role-change__hint">
              {requestsApproval
                ? "Role changes are applied by Admin. Permission grants for an AWC go to Access Control for approval."
                : `Admin — applies at once. Current role: ${roleMeta.name}`}
            </p>
          </div>
          <div className="ua-tm-role-change__controls">
            <CfgSelect
              className="ua-tm-role-change__select"
              options={roleOptions.map((role) => {
                const value = role.id || role.roleKey;
                const current =
                  (role.id && role.id === member.consoleRoleId) ||
                  (!member.consoleRoleId && role.roleKey === member.primaryRoleKey);
                return {
                  value,
                  label: current ? `${role.name} (current)` : role.name,
                };
              })}
              value={roleDraft}
              disabled={member.isSuperAdmin || savingRole || requestsApproval}
              onChange={setRoleDraft}
              ariaLabel="Assigned role"
              placeholder="Choose role"
            />
            <button style={{backgroundColor:"rgb(94, 106, 210)",border:"1px solid rgb(94, 106, 210)"}}
              type="button"
              className="ua-tm-role-change__save"
              disabled={
                member.isSuperAdmin ||
                savingRole ||
                requestsApproval ||
                String(roleDraft) === String(member.consoleRoleId || member.primaryRoleKey || "")
              }
              onClick={handleSaveRole}
            >
              {savingRole ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {profileOpen ? (
          <div className="ua-tm-profile-details">
            <div className="ua-tm-profile-panel">
              <div className="ua-tm-profile-panel__title">Personal details</div>
              <dl className="ua-tm-profile-panel__rows">
                <div><dt>Full name:</dt><dd title={member.name || undefined}>{member.name || "—"}</dd></div>
                <div><dt>Email:</dt><dd>{member.email || "—"}</dd></div>
                <div><dt>Mobile:</dt><dd>{memberPhone(member)}</dd></div>
                <div><dt>Date of birth:</dt><dd>{formatMemberDob(member.dateOfBirth)}</dd></div>
                <div><dt>Location:</dt><dd>{memberLocation(member)}</dd></div>
                <div >
                  <dt>Bio:</dt>
                  <dd>
                    {member.bio ? (
                      <p className="ua-tm-profile-panel__bio">{member.bio}</p>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="ua-tm-profile-panel">
              <div className="ua-tm-profile-panel__title">Role &amp; engagement</div>
              <dl className="ua-tm-profile-panel__rows">
                <div><dt>Role:</dt><dd>{roleMeta.name}</dd></div>
                <div><dt>Status:</dt><dd>{member.displayStatus || "—"}</dd></div>
                <div><dt>Detail:</dt><dd>{member.meta || "—"}</dd></div>
                <div><dt>Joined:</dt><dd>{formatProfileDate(member.joinedAt)}</dd></div>
                <div><dt>Referral code:</dt><dd>{member.referralCode || "—"}</dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </section>

      {showClients ? (
        <section className="ua-tm-card">
          <div className="ua-tm-section-head">
            <div className="ua-tm-section-head__title">Clients & team</div>
            <div className="ua-tm-section-head__hint">
              {member.clientCount ?? 0} <font style={{color:"rgb(154, 166, 184)", fontWeight:"400"}}>
                clients assigned — tap a card to view them</font>
            </div>
          </div>
          <div className="ua-tm-stat-grid">
            {clientCards.map((card) => (
              <button
                key={card.key}
                type="button"
                className={`ua-tm-stat ua-tm-stat--${card.tone}`}
                onClick={() =>
                  navigate(`${UPDATED_ADMIN_PATHS.users}?coach=${encodeURIComponent(member.id)}`)
                }
              >
                <div className="ua-tm-stat__label" style={{color:"black"}}>{card.label}</div>
                <div className="ua-tm-stat__value">
                  <strong>{card.count}</strong>
                  {card.pct != null ? <span className="ua-tm-stat__pct">{card.pct}%</span> : null}
                </div>
                <span className="ua-tm-stat__bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, Math.min(100, card.bar || 0))}%` }} />
                </span>
                <div className="ua-tm-stat__sub">{card.sub}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showClients && contentItems.length ? (
        <section className="ua-tm-card">
          <div className="ua-tm-section-head">
            <div className="ua-tm-section-head__title">Content</div>
            <div className="ua-tm-section-head__hint" style={{color:"rgb(154, 166, 184)",fontWeight:"400"}}>
              {contentLive} of {contentItems.length} live for clients
              {/* {canEditContent ? " — upload, replace or hide any of them" : ""} */}
            </div>
          </div>
          <div className="ua-tm-content-list">
            {contentItems.map((item) => {
              const busy = contentBusyKey === item.id;
              const hasMedia = Boolean(item.hasMedia ?? item.url);
              function handleView() {
                if (item.kind === "letter") {
                  navigate(UPDATED_ADMIN_PATHS.commitmentLetters(member.id));
                  return;
                }
                if (item.url) {
                  window.open(item.url, "_blank", "noopener,noreferrer");
                  return;
                }
                onToast("No intro video uploaded yet");
              }
              function handleDownload() {
                if (!item.downloadUrl) {
                  onToast(
                    item.kind === "letter"
                      ? "No commitment letter to download"
                      : "No intro video to download",
                  );
                  return;
                }
                if (downloadContentFile(item.downloadUrl, contentDownloadName(item))) {
                  onToast(
                    item.kind === "letter"
                      ? "Commitment letter download started"
                      : "Intro video download started",
                  );
                }
              }
              return (
                <div key={item.id} className={`ua-tm-content-row${item.live ? " is-live" : ""}`}>
                  <div
                    className={`ua-tm-content-row__icon${item.kind === "letter" ? " ua-tm-content-row__icon--doc" : ""}`}
                    aria-hidden="true"
                  >
                    {item.kind === "letter" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M8 13h8" />
                        <path d="M8 17h5" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    )}
                  </div>
                  <div className="ua-tm-content-row__body">
                    <div className="ua-tm-content-row__title">{item.title}</div>
                    <div className="ua-tm-content-row__meta">{item.meta || "Not uploaded"}</div>
                  </div>
                  <span className={`ua-tm-content-row__live${item.live ? "" : " ua-tm-content-row__live--off"}`}>
                    {item.live ? "Live in app" : "Hidden"}
                  </span>
                  <div className="ua-tm-content-row__actions">
                    <button
                      type="button"
                      className="ua-tm-content-row__btn ua-tm-content-row__btn--view"
                      disabled={busy}
                      onClick={handleView}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="ua-tm-content-row__btn ua-tm-content-row__btn--download ua-tm-content-row__btn--wide"
                      disabled={busy || !item.downloadUrl}
                      onClick={handleDownload}
                    >
                      Download
                    </button>
                    {canEditContent ? (
                      <button
                        type="button"
                        className="ua-tm-content-row__btn ua-tm-content-row__btn--primary ua-tm-content-row__btn--wide"
                        disabled={busy}
                        onClick={() => startContentUpload(item)}
                      >
                        {busy ? "Saving…" : hasMedia ? "Replace" : "Upload"}
                      </button>
                    ) : null}
                    <ContentRowMoreMenu disabled={busy}>
                      <button
                        type="button"
                        role="menuitem"
                        className="ua-tm-content-more__item"
                        disabled={busy || !item.downloadUrl}
                        onClick={handleDownload}
                      >
                        Download
                      </button>
                      {canEditContent ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="ua-tm-content-more__item"
                          disabled={busy}
                          onClick={() => startContentUpload(item)}
                        >
                          {busy ? "Saving…" : hasMedia ? "Replace" : "Upload"}
                        </button>
                      ) : null}
                    </ContentRowMoreMenu>
                    {canEditContent ? (
                      <ContentToggle
                        live={Boolean(item.live)}
                        disabled={busy}
                        onChange={() => toggleContentItem({ ...item, hasMedia })}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <input ref={videoRef} type="file" accept="video/*" hidden onChange={handleIntroVideoSelected} />
        </section>
      ) : null}

      <section ref={permsRef} id="permissions" className="ua-tm-card ua-tm-perms">
        <div className="ua-tm-perms__head">
          <div>
            <div className="ua-tm-section-head__title">Permissions</div>
            <p className="ua-tm-perms__intro">
              {requestsApproval
                ? "Toggle what this assistant can do, then send the request. Admin approval on Access Control grants the permission."
                : "Toggle what this member can do, then save. Reset puts every row back to the role default."}
            </p>
          </div>
          <div className="ua-tm-perms__actions">
            <span className="ua-tm-perms__count">
              {granted} <font style={{color:"rgb(154, 166, 184)"}}>of {member.totalSlots || totalSlots} granted</font>
              {/* {member.hasOverrides ? " · personal override" : ""} */}
            </span>
            <button type="button" className="ua-tm-perms__reset" onClick={handleResetPerms} disabled={savingPerms || !canEditPerms}>
              <span aria-hidden="true">↺</span> Reset to default
            </button>
            <button
              type="button"
              className={`ua-tm-perms__save${dirtyPerms ? " ua-tm-perms__save--dirty" : ""}`}
              onClick={handleSavePerms}
              disabled={!canEditPerms || !dirtyPerms || savingPerms}
            >
              {savingPerms
                ? requestsApproval
                  ? "Sending…"
                  : "Saving…"
                : dirtyPerms
                  ? requestsApproval
                    ? "Request approval"
                    : "Save"
                  : "Saved"}
            </button>
            <button
              type="button"
              className="ua-tm-perms__fold"
              aria-expanded={permsOpen}
              aria-label={permsOpen ? "Collapse permissions" : "Expand permissions"}
              onClick={() => setPermsOpen((open) => !open)}
            >
              <CaretIcon up={permsOpen} />
            </button>
          </div>
        </div>
        {memberPendingRequests(member).length ? (
          <div className="ua-tm-pending">
            <div className="ua-tm-pending__title">
              Waiting for Admin approval ({memberPendingRequests(member).length})
            </div>
            {memberPendingRequests(member).map((req) => (
              <div key={req.id} className="ua-tm-pending__item">
                <div className="ua-tm-pending__meta">{req.title}</div>
                <div className="ua-tm-pending__meta">{req.meta}</div>
              </div>
            ))}
          </div>
        ) : null}

        {permsOpen ? (
          <div className="ua-tm-perms__matrix">
          <div className="ua-ac-matrix__scroll">
            <div className="ua-ac-matrix__cols">
              <div className="ua-ac-matrix__col-label">Feature</div>
              <div className="ua-ac-matrix__acts">
                {permActs.map((a) => (
                  <div key={a} className="ua-ac-matrix__col-act">
                    {a}
                  </div>
                ))}
              </div>
              <div className="ua-ac-matrix__col-granted">On</div>
            </div>
            {matrixGroups.map((group) => (
              <div key={group.label} className="ua-ac-matrix__group">
                <div className="ua-ac-matrix__group-label">{group.label}</div>
                {group.features.map((row) => {
                  const [, name, fid, acts] = row;
                  const onCount = featureOnCount(grants, fid, acts);
                  return (
                    <div key={fid} className="ua-ac-matrix__row">
                      <div className="ua-ac-matrix__perm">
                        <span className="ua-ac-matrix__perm-name">{name}</span>
                      </div>
                      <div className="ua-ac-matrix__acts">
                        {permActs.map((act) => {
                          const applicable = acts.includes(act);
                          if (!applicable) {
                            return (
                              <div key={act} className="ua-ac-matrix__cell">
                                <span className="ua-ac-matrix__cell-label">{act}</span>
                                <span className="ua-ac-dash">—</span>
                              </div>
                            );
                          }
                          return (
                            <div key={act} className="ua-ac-matrix__cell">
                              <span className="ua-ac-matrix__cell-label">{act}</span>
                              <ToggleSwitch
                                on={memberHas(grants, fid, act)}
                                disabled={!canEditPerms}
                                onClick={() => handleToggle(fid, act)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="ua-ac-matrix__granted">
                        <span className={`ua-ac-granted-pill${onCount > 0 ? " ua-ac-granted-pill--on" : ""}`}>
                          {onCount}/{acts.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
