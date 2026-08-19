import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fetchAccessPolicies } from "../api/accessApi.js";
import { adminListSops, getAdminToken } from "../api/sopApi.js";
import { fetchTeamMembers } from "../api/teamsApi.js";
import { fetchScopedUsers, fetchUsers } from "../api/usersApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { ACCESS_TABS } from "../data/accessData.js";
import { configPermissionPrefix, listConfigItems } from "../data/configsData.js";
import { NAV_ITEMS, UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

const RESULT_LIMIT = 6;
const SCOPED_ROLES = new Set(["wc", "awc", "trainee"]);

function haystackMatch(query, ...parts) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return parts.some((part) => String(part || "").toLowerCase().includes(q));
}

function resultId(group, id) {
  return `${group}:${id}`;
}

export function HeaderSearch() {
  const navigate = useNavigate();
  const {
    can,
    navSections,
    hasFullAccess,
    isSuperAdmin,
    dataScope,
    viewAs,
    viewAsPersona,
    token,
  } = useViewAs();

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 52, left: 16, width: 320 });
  const [remote, setRemote] = useState({
    users: [],
    members: [],
    sops: [],
    policies: [],
  });

  const canUsers = can("console.cl.view");
  const canTeams = can("console.tm.view");
  const canSop = can("console.sop.view");
  const canAccess = hasFullAccess || (isSuperAdmin && navSections.has("access"));
  const canConfigs = navSections.has("configs");
  const useScopedUsers = dataScope !== "all" || SCOPED_ROLES.has(viewAs) || SCOPED_ROLES.has(viewAsPersona);

  const placeholder = useMemo(() => {
    const bits = [];
    if (canUsers) bits.push("users");
    if (canTeams) bits.push("teams");
    if (canAccess) bits.push("policies");
    if (canConfigs) bits.push("configs");
    if (canSop) bits.push("SOPs");
    if (!bits.length) return "Search pages…";
    return `Search ${bits.join(", ")}…`;
  }, [canAccess, canConfigs, canSop, canTeams, canUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  function positionPanel() {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(440, Math.max(rect.width, 280), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    setCoords({
      top: rect.bottom + 8,
      left,
      width,
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    positionPanel();
    function onResize() {
      positionPanel();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  const pages = useMemo(() => {
    const q = debounced;
    const hits = [];

    for (const item of NAV_ITEMS) {
      if (!navSections.has(item.id)) continue;
      if (!q || haystackMatch(q, item.label, item.id)) {
        hits.push({
          id: resultId("page", item.id),
          group: "Pages",
          title: item.label,
          subtitle: "Section",
          path: item.path,
        });
      }
    }

    if (canAccess && q) {
      for (const tab of ACCESS_TABS) {
        if (!haystackMatch(q, tab.label, "access", "policy", "policies", "roles", "members", "audit")) continue;
        hits.push({
          id: resultId("access", tab.id),
          group: "Access Control",
          title: tab.label,
          subtitle: "Access Control",
          path: tab.id === "roles" ? UPDATED_ADMIN_PATHS.access : `${UPDATED_ADMIN_PATHS.access}?tab=${tab.id}`,
        });
      }
    }

    if (canConfigs && q) {
      for (const { item, groupName } of listConfigItems()) {
        if (!can(`console.${configPermissionPrefix(item.id)}.view`)) continue;
        if (q && !haystackMatch(q, item.name, item.note, groupName, item.id, item.owner)) continue;
        hits.push({
          id: resultId("config", item.id),
          group: "Configs",
          title: item.name,
          subtitle: groupName,
          path: `${UPDATED_ADMIN_PATHS.configs}/${item.id}`,
        });
      }
    }

    if (!q) return hits.slice(0, 8);
    return hits.slice(0, 12);
  }, [can, canAccess, canConfigs, debounced, navSections]);

  useEffect(() => {
    if (!open || !debounced) {
      setRemote({ users: [], members: [], sops: [], policies: [] });
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    async function run() {
      const jobs = [];

      if (canUsers) {
        jobs.push(
          (useScopedUsers
            ? fetchScopedUsers({ page: 1, limit: RESULT_LIMIT, search: debounced })
            : fetchUsers({ page: 1, limit: RESULT_LIMIT, search: debounced })
          )
            .then((res) => ({ kind: "users", rows: res?.users || [] }))
            .catch(() => ({ kind: "users", rows: [] })),
        );
      }

      if (canTeams) {
        jobs.push(
          fetchTeamMembers({ page: 1, limit: RESULT_LIMIT, search: debounced })
            .then((res) => ({
              kind: "members",
              rows: (res?.members || []).filter((m) => !m.isSuperAdmin && m.primaryRoleKey !== "admin"),
            }))
            .catch(() => ({ kind: "members", rows: [] })),
        );
      }

      if (canSop) {
        jobs.push(
          adminListSops(token || getAdminToken(), { page: 1, limit: RESULT_LIMIT, search: debounced })
            .then((res) => ({ kind: "sops", rows: res?.sops || [] }))
            .catch(() => ({ kind: "sops", rows: [] })),
        );
      }

      if (canAccess) {
        jobs.push(
          fetchAccessPolicies()
            .then((policies) => ({
              kind: "policies",
              rows: (Array.isArray(policies) ? policies : []).filter((policy) =>
                haystackMatch(debounced, policy.name, policy.description, policy.id),
              ),
            }))
            .catch(() => ({ kind: "policies", rows: [] })),
        );
      }

      const settled = await Promise.all(jobs);
      if (cancelled) return;

      const next = { users: [], members: [], sops: [], policies: [] };
      for (const item of settled) {
        if (item.kind === "users") next.users = item.rows.slice(0, RESULT_LIMIT);
        if (item.kind === "members") next.members = item.rows.slice(0, RESULT_LIMIT);
        if (item.kind === "sops") next.sops = item.rows.slice(0, RESULT_LIMIT);
        if (item.kind === "policies") next.policies = item.rows.slice(0, RESULT_LIMIT);
      }
      setRemote(next);
    }

    run().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canAccess, canSop, canTeams, canUsers, debounced, open, token, useScopedUsers]);

  const results = useMemo(() => {
    const list = [...pages];

    for (const user of remote.users) {
      if (!user?.id) continue;
      list.push({
        id: resultId("user", user.id),
        group: "Users",
        title: user.name,
        subtitle: user.email || user.phone || "Client",
        path: UPDATED_ADMIN_PATHS.userDetail(user.id),
      });
    }

    for (const member of remote.members) {
      list.push({
        id: resultId("member", member.id || member._id),
        group: "Teams",
        title: member.name,
        subtitle: member.email || member.primaryRoleKey || "Team member",
        path: `${UPDATED_ADMIN_PATHS.teams}/${member.id || member._id}`,
      });
    }

    for (const sop of remote.sops) {
      list.push({
        id: resultId("sop", sop.id || sop._id),
        group: "SOP",
        title: sop.title,
        subtitle: sop.category || "SOP library",
        path: UPDATED_ADMIN_PATHS.sop,
      });
    }

    for (const policy of remote.policies) {
      list.push({
        id: resultId("policy", policy.id),
        group: "Policies",
        title: policy.name,
        subtitle: policy.description || "Access policy",
        path: `${UPDATED_ADMIN_PATHS.access}?tab=policies`,
      });
    }

    const seen = new Set();
    return list.filter((row) => {
      if (seen.has(row.id) || seen.has(row.path + row.title)) return false;
      seen.add(row.id);
      seen.add(row.path + row.title);
      return true;
    });
  }, [pages, remote]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(event) {
      if (wrapRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) {
        return;
      }
      setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function go(result) {
    if (!result?.path) return;
    setOpen(false);
    setQuery("");
    navigate(result.path);
  }

  function onKeyDown(event) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[activeIndex];
      if (hit) go(hit);
    }
  }

  const grouped = useMemo(() => {
    const order = [];
    const map = new Map();
    for (const row of results) {
      if (!map.has(row.group)) {
        map.set(row.group, []);
        order.push(row.group);
      }
      map.get(row.group).push(row);
    }
    return order.map((group) => ({ group, items: map.get(group) }));
  }, [results]);

  const showPanel = open && (query.trim().length > 0 || results.length > 0);
  const empty = showPanel && !loading && query.trim() && results.length === 0;

  let flatIndex = -1;

  return (
    <div className="header__search" ref={wrapRef}>
      <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="header__search-input"
        placeholder={placeholder}
        aria-label="Search"
        aria-expanded={showPanel}
        aria-controls="header-search-results"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          positionPanel();
        }}
        onKeyDown={onKeyDown}
      />

      {showPanel
        ? createPortal(
            <div
              ref={panelRef}
              id="header-search-results"
              className="header__search-panel"
              role="listbox"
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              {loading ? <div className="header__search-status">Searching…</div> : null}
              {empty ? (
                <div className="header__search-status">No matches in the sections you can access.</div>
              ) : null}
              {!query.trim() && results.length ? (
                <div className="header__search-status">Pages you can open</div>
              ) : null}
              {grouped.map(({ group, items }) => (
                <div key={group} className="header__search-group">
                  <div className="header__search-group-label">{group}</div>
                  {items.map((row) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`header__search-item${active ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(row)}
                      >
                        <span className="header__search-item-title">{row.title}</span>
                        <span className="header__search-item-sub">{row.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
