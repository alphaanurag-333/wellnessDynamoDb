import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { CfgSelect, OrangeButton, PageHeader, PillTabs, TableScroll, ListPagination } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { staffInitials } from "../data/teamsData.js";
import {
  approveAccessRequest,
  attachAccessPolicy,
  createAccessPolicy,
  createAccessRole,
  deleteAccessPolicy,
  deleteAccessRole,
  fetchAccessApprovals,
  fetchAccessAuditLog,
  fetchAccessMembers,
  fetchAccessPolicies,
  fetchAccessRoles,
  rejectAccessRequest,
  rolesToGrantsState,
  rolesToParentsState,
  rolesToViewsState,
  setAccessMemberRole,
  updateAccessPolicy,
  updateAccessRole,
} from "../api/accessApi.js";
import {
  ACCESS_TABS,
  AC_SECTIONS,
  DEFAULT_GRANTS,
  DEFAULT_PARENTS,
  DEFAULT_VIEWS,
  PERM_ACTS,
  PERM_CATALOG,
  ROLE_META,
  ROLE_ORDER,
  TOTAL_PERM_SLOTS,
  cellKind,
  cloneGrants,
  copyRoleGrants,
  countGranted,
  featureGrantedCount,
  roleHas,
  sectionStats,
  toggleGrant,
  vsParentDelta,
} from "../data/accessData.js";

function roleUiKey(role) {
  return role?.roleKey || role?.id;
}

function capitalizeScope(value) {
  const v = String(value || "all").toLowerCase();
  if (v === "all") return "All";
  if (v === "team") return "Team";
  if (v === "assigned") return "Assigned";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function scopeToApi(label) {
  return String(label || "All").toLowerCase();
}

function mapApiRolesToUi(apiRoles) {
  return (apiRoles || []).map((r) => ({
    id: roleUiKey(r),
    dbId: r.id,
    name: r.name,
    color: r.color || "#5e6ad2",
    bg: r.bg || "#eceefc",
    bd: r.bd || "#dcdff7",
    scope: capitalizeScope(r.dataScope),
    locked: Boolean(r.locked),
    system: Boolean(r.system),
    memberCount: r.memberCount || 0,
    desc: r.description || "",
    roleKey: r.roleKey || null,
  }));
}

function ToggleSwitch({ kind, onClick, disabled }) {
  if (kind === "na") return <span className="ua-ac-dash">—</span>;
  return (
    <button
      type="button"
      className={`ua-ac-switch ua-ac-switch--${kind}${disabled ? " ua-ac-switch--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={kind === "on" || kind === "added" || kind === "inherited"}
    >
      <span className="ua-ac-switch__knob" />
    </button>
  );
}

function CreateRoleModal({ roles, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [inheritFrom, setInheritFrom] = useState("");

  return (
    <div className="ua-dialog-backdrop" onClick={onClose} role="presentation">
      <div className="ua-ac-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-ac-modal__title">Create a role</div>
        <p className="ua-ac-modal__body">
          A new role can inherit everything from an existing one, then add or remove permissions on top.
          Later changes to the parent flow through automatically.
        </p>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Role name</span>
          <input maxLength={35}
            className="ua-ac-field__input"
            placeholder="Role name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Start from</span>
          <select
            className="ua-ac-field__input"
            value={inheritFrom}
            onChange={(e) => setInheritFrom(e.target.value)}
          >
            <option value="">Nothing — start from zero</option>
            {roles.map((r) => (
              <option key={r.dbId || r.id} value={r.dbId}>
                Inherit from {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ua-ac-modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-ac-modal__primary"
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), inheritFromRoleId: inheritFrom || null })}
          >
            Create role
          </button>
        </div>
      </div>
    </div>
  );
}

function featureMeta(featureId) {
  const row = PERM_CATALOG.find((entry) => entry[2] === featureId);
  if (!row) return null;
  return {
    sectionLabel: row[0],
    featureName: row[1],
    featureId: row[2],
    actions: row[3],
    sectionId: row[4],
  };
}

function policyAttachmentLabel(attachment) {
  if (!attachment) return "";
  if (attachment.targetType === "role") return attachment.roleName || ROLE_META[attachment.roleKey]?.name || attachment.roleKey;
  return attachment.memberName || attachment.memberEmail || "Member";
}

function CreatePolicyModal({ policy, busy, onClose, onSubmit }) {
  const [name, setName] = useState(policy?.name || "");
  const [featureId, setFeatureId] = useState(policy?.featureId || PERM_CATALOG[0]?.[2] || "");
  const selected = featureMeta(featureId);
  const isEditing = Boolean(policy);

  return (
    <div className="ua-dialog-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div className="ua-ac-modal ua-policy-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-ac-modal__title">{isEditing ? "Edit policy" : "Create a policy"}</div>
        <p className="ua-ac-modal__body">
          Quickly create a deny bundle, then attach it to a role or to a specific member.
        </p>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Policy name</span>
          <input
            className="ua-ac-field__input"
            placeholder="Policy name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </label>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Deny every action on</span>
          <select
            className="ua-ac-field__input"
            value={featureId}
            onChange={(event) => setFeatureId(event.target.value)}
          >
            {PERM_CATALOG.map((row) => (
              <option key={row[2]} value={row[2]}>
                {row[1]}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <div className="ua-policy-modal__preview">
            {selected.actions.map((action) => (
              <div key={action} className="ua-policy-card__rule">
                <span className="ua-rule-badge ua-rule-badge--deny">DENY</span>
                <span>{`${action} · ${selected.featureName}`}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="ua-ac-modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-ac-modal__primary"
            disabled={!name.trim() || !featureId || busy}
            onClick={() => onSubmit({ name: name.trim(), featureId })}
          >
            {busy ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachPolicyModal({ policy, roles, members, busy, onClose, onSubmit }) {
  const [targetType, setTargetType] = useState("role");
  const [targetId, setTargetId] = useState("");
  const options = targetType === "role" ? roles : members;

  return (
    <div className="ua-dialog-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div className="ua-ac-modal ua-policy-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-ac-modal__title">Attach a policy</div>
        <p className="ua-ac-modal__body">
          Grant this deny bundle to a whole role or one member. A policy deny beats the role baseline.
        </p>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Policy</span>
          <select className="ua-ac-field__input" value={policy?.id || ""} disabled>
            <option value={policy?.id || ""}>{policy?.name || "Policy"}</option>
          </select>
        </label>
        <div className="ua-ac-field">
          <span className="ua-ac-field__label">Attach to</span>
          <div className="ua-policy-modal__switches">
            <button
              type="button"
              className={`ua-policy-modal__switch${targetType === "role" ? " ua-policy-modal__switch--active" : ""}`}
              onClick={() => {
                setTargetType("role");
                setTargetId("");
              }}
            >
              A role
            </button>
            <button
              type="button"
              className={`ua-policy-modal__switch${targetType === "member" ? " ua-policy-modal__switch--active" : ""}`}
              onClick={() => {
                setTargetType("member");
                setTargetId("");
              }}
            >
              A specific member
            </button>
          </div>
        </div>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">{targetType === "role" ? "Role" : "Member"}</span>
          <select
            className="ua-ac-field__input"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">{targetType === "role" ? "Choose a role…" : "Choose a member…"}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ua-ac-modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-ac-modal__primary"
            disabled={!targetId || busy}
            onClick={() =>
              onSubmit(
                targetType === "role"
                  ? { targetType: "role", roleKey: targetId }
                  : { targetType: "member", accountId: targetId },
              )
            }
          >
            {busy ? "Attaching…" : "Attach"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PoliciesTab({ onToast }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [policies, setPolicies] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [editorPolicy, setEditorPolicy] = useState(undefined);
  const [attachPolicyTarget, setAttachPolicyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextPolicies, roles, memberResult] = await Promise.all([
        fetchAccessPolicies(),
        fetchAccessRoles(),
        fetchAccessMembers({ page: 1, limit: 200 }),
      ]);
      setPolicies(Array.isArray(nextPolicies) ? nextPolicies : []);
      setRoleOptions(
        (Array.isArray(roles) ? roles : [])
          .map((role) => ({
            id: role.roleKey || role.id,
            label: role.name || ROLE_META[role.roleKey]?.name || role.roleKey || role.id,
          }))
          .filter((role) => role.id),
      );
      setMemberOptions(
        (Array.isArray(memberResult?.members) ? memberResult.members : []).map((member) => ({
          id: member.id,
          label: `${member.name} (${member.email})`,
        })),
      );
    } catch (err) {
      setError(err?.message || "Failed to load policies");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateOrUpdate(payload) {
    setBusyAction("save");
    try {
      if (editorPolicy?.id) {
        await updateAccessPolicy(editorPolicy.id, payload);
        onToast(`Updated policy "${payload.name}"`);
      } else {
        await createAccessPolicy(payload);
        onToast(`Created policy "${payload.name}"`);
      }
      setEditorPolicy(undefined);
      await load();
    } catch (err) {
      onToast(err?.message || "Could not save policy");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAttach(payload) {
    if (!attachPolicyTarget) return;
    setBusyAction("attach");
    try {
      await attachAccessPolicy(attachPolicyTarget.id, payload);
      onToast(`Attached "${attachPolicyTarget.name}"`);
      setAttachPolicyTarget(null);
      await load();
    } catch (err) {
      onToast(err?.message || "Could not attach policy");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyAction("delete");
    try {
      await deleteAccessPolicy(deleteTarget.id);
      onToast(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      onToast(err?.message || "Could not delete policy");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <>
      <div className="ua-section-bar">
        <span>Reusable allow/deny bundles. Attach one to a whole role or to a single member.</span>
        <OrangeButton onClick={() => setEditorPolicy(null)}>+ Create policy</OrangeButton>
      </div>

      {loading ? <BrandLoader variant="page" label="Loading policies…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={load}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error ? (
        policies.length ? (
          <div className="ua-policy-grid">
            {policies.map((policy) => (
              <div key={policy.id} className="ua-policy-card">
                <div className="ua-policy-card__head">
                  <div>
                    <div className="ua-policy-card__name">{policy.name}</div>
                    <div className="ua-policy-card__desc">{policy.desc}</div>
                  </div>
                  <span className="ua-policy-card__scope">{policy.scope}</span>
                </div>
                <div className="ua-policy-card__rules">
                  {policy.rules.map((rule) => (
                    <div key={`${policy.id}-${rule.action}`} className="ua-policy-card__rule">
                      <span className={`ua-rule-badge ua-rule-badge--${rule.type.toLowerCase()}`}>{rule.type}</span>
                      <span>{rule.text}</span>
                    </div>
                  ))}
                </div>
                <div className="ua-policy-card__attachments">
                  <span className="ua-policy-card__attachments-label">Attached to</span>
                  <div className="ua-policy-card__chips">
                    {policy.attachments?.length ? (
                      policy.attachments.map((attachment) => (
                        <span key={attachment.id} className="ua-policy-card__chip">
                          {policyAttachmentLabel(attachment)}
                        </span>
                      ))
                    ) : (
                      <span className="ua-policy-card__empty">Nobody yet</span>
                    )}
                  </div>
                </div>
                <div className="ua-policy-card__foot">
                  <span>
                    Attached to <b>{policy.attachedCount || 0}</b>
                  </span>
                  <div>
                    <button type="button" className="ua-soft-btn" onClick={() => setEditorPolicy(policy)}>
                      Edit
                    </button>
                    <button type="button" className="ua-soft-btn" onClick={() => setDeleteTarget(policy)}>
                      Delete
                    </button>
                    <button type="button" className="ua-green-btn" onClick={() => setAttachPolicyTarget(policy)}>
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ua-table-card ua-policy-empty">
            <div className="ua-policy-empty__title">No policies yet</div>
            <div className="ua-policy-empty__sub">Create your first deny bundle, then attach it to a role or a member.</div>
          </div>
        )
      ) : null}

      {editorPolicy !== undefined ? (
        <CreatePolicyModal
          policy={editorPolicy}
          busy={busyAction === "save"}
          onClose={() => {
            if (busyAction !== "save") setEditorPolicy(undefined);
          }}
          onSubmit={handleCreateOrUpdate}
        />
      ) : null}

      {attachPolicyTarget ? (
        <AttachPolicyModal
          policy={attachPolicyTarget}
          roles={roleOptions}
          members={memberOptions}
          busy={busyAction === "attach"}
          onClose={() => {
            if (busyAction !== "attach") setAttachPolicyTarget(null);
          }}
          onSubmit={handleAttach}
        />
      ) : null}

      {deleteTarget ? (
        <div className="ua-dialog-backdrop" role="presentation">
          <div className="ua-dialog" role="dialog" aria-modal="true">
            <div className="ua-dialog__title">Delete policy?</div>
            <p className="ua-dialog__body">
              This will remove <b>{deleteTarget.name}</b> and all of its role/member attachments.
            </p>
            <div className="ua-dialog__actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setDeleteTarget(null)}
                disabled={busyAction === "delete"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-dialog__btn-danger"
                onClick={handleDelete}
                disabled={busyAction === "delete"}
              >
                {busyAction === "delete" ? "Deleting…" : "Delete policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RolesPermissionsTab({ onToast }) {
  const { reloadLiveRoles } = useViewAs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiRoles, setApiRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [grants, setGrants] = useState({});
  const [parents, setParents] = useState({});
  const [views, setViews] = useState({});
  const [scope, setScope] = useState("All");
  const [activeSection, setActiveSection] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef(null);
  const stateRef = useRef({ grants: {}, parents: {}, views: {}, apiRoles: [], selectedRole: "admin", scope: "All" });

  const hydrate = useCallback((roles) => {
    const nextGrants = rolesToGrantsState(roles);
    const nextParents = rolesToParentsState(roles);
    const nextViews = rolesToViewsState(roles);
    setApiRoles(roles);
    setGrants(nextGrants);
    setParents(nextParents);
    setViews(nextViews);
    setDirty(false);
    stateRef.current = {
      ...stateRef.current,
      grants: nextGrants,
      parents: nextParents,
      views: nextViews,
      apiRoles: roles,
    };
  }, []);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const roles = await fetchAccessRoles();
      hydrate(roles);
      await reloadLiveRoles();
      const firstKey = roles[0] ? roleUiKey(roles[0]) : "admin";
      setSelectedRole((prev) => {
        const stillThere = roles.some((r) => roleUiKey(r) === prev);
        return stillThere ? prev : firstKey;
      });
      const first = roles.find((r) => roleUiKey(r) === firstKey) || roles[0];
      if (first) setScope(capitalizeScope(first.dataScope));
    } catch (err) {
      setError(err?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [hydrate, reloadLiveRoles]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    stateRef.current = { grants, parents, views, apiRoles, selectedRole, scope };
  }, [grants, parents, views, apiRoles, selectedRole, scope]);

  const roleList = useMemo(() => mapApiRolesToUi(apiRoles), [apiRoles]);
  const role = roleList.find((r) => r.id === selectedRole) || roleList[0];

  const granted = role ? countGranted(grants, parents, role.id) : 0;
  const delta = role ? vsParentDelta(grants, parents, role.id) : { standalone: true, added: 0, removed: 0 };
  const sections = role ? sectionStats(grants, parents, role.id, views) : [];
  const openSections = sections.filter((s) => s.open).length;
  const parentMeta = role && parents[role.id]
    ? ROLE_META[parents[role.id]] || roleList.find((r) => r.id === parents[role.id])
    : null;

  const matrixRows = useMemo(() => {
    const rows = activeSection
      ? PERM_CATALOG.filter((r) => r[4] === activeSection)
      : PERM_CATALOG;
    const groups = [];
    let cur = null;
    for (const row of rows) {
      if (!cur || cur.label !== row[0]) {
        cur = { label: row[0], sectionId: row[4], features: [] };
        groups.push(cur);
      }
      cur.features.push(row);
    }
    return groups;
  }, [activeSection]);

  const persistSelected = useCallback(async () => {
    const snap = stateRef.current;
    const ui = mapApiRolesToUi(snap.apiRoles).find((r) => r.id === snap.selectedRole);
    if (!ui || ui.locked) return;
    const parentKey = snap.parents[ui.id] || null;
    const parentRole = snap.apiRoles.find((r) => roleUiKey(r) === parentKey);
    try {
      const updated = await updateAccessRole(ui.dbId, {
        grants: snap.grants[ui.id],
        navSections: snap.views[ui.id] || [],
        dataScope: scopeToApi(snap.scope),
        inheritsFromRoleId: parentRole?.id || null,
      });
      setApiRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setDirty(false);
      onToast("Saved");
      reloadLiveRoles();
    } catch (err) {
      onToast(err?.message || "Save failed");
    }
  }, [onToast, reloadLiveRoles]);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSelected();
    }, 500);
  }, [persistSelected]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function selectRole(id) {
    setSelectedRole(id);
    const meta = roleList.find((r) => r.id === id);
    if (meta?.scope) setScope(meta.scope);
    setActiveSection(null);
  }

  function handleToggle(featureId, action) {
    if (!role || role.locked || role.id === "admin") {
      onToast("Admin permissions are locked");
      return;
    }
    setGrants((g) => {
      const next = toggleGrant(g, parents, role.id, featureId, action);
      stateRef.current.grants = next;
      return next;
    });
    scheduleSave();
  }

  function handleParentChange(nextParent) {
    if (!role || role.locked) return;
    setParents((p) => {
      const next = { ...p, [role.id]: nextParent || null };
      stateRef.current.parents = next;
      return next;
    });
    if (nextParent) {
      setGrants((g) => {
        const next = cloneGrants(g);
        next[role.id] = copyRoleGrants(g, nextParent);
        stateRef.current.grants = next;
        return next;
      });
      setViews((v) => {
        const next = {
          ...v,
          [role.id]: [...(v[nextParent] || DEFAULT_VIEWS[nextParent] || ["dashboard"])],
        };
        stateRef.current.views = next;
        return next;
      });
    }
    onToast(nextParent ? `Now inherits from ${ROLE_META[nextParent]?.name || nextParent}` : "Standalone role");
    scheduleSave();
  }

  function toggleSectionNav(sectionId) {
    if (!role || role.locked) {
      onToast("Admin sections are locked");
      return;
    }
    setViews((v) => {
      const cur = new Set(v[role.id] || []);
      if (cur.has(sectionId)) cur.delete(sectionId);
      else cur.add(sectionId);
      const next = { ...v, [role.id]: [...cur] };
      stateRef.current.views = next;
      return next;
    });
    scheduleSave();
  }

  function handleScopeChange(next) {
    if (!role || role.locked) return;
    setScope(next);
    stateRef.current.scope = next;
    scheduleSave();
  }

  async function resetRole() {
    if (!role || role.locked) return;
    const key = role.roleKey || role.id;
    const nextGrants = cloneGrants(grants);
    if (key in DEFAULT_GRANTS) {
      nextGrants[role.id] =
        DEFAULT_GRANTS[key] == null
          ? null
          : cloneGrants({ [key]: DEFAULT_GRANTS[key] })[key];
    } else {
      nextGrants[role.id] = {};
    }
    const nextParents = { ...parents, [role.id]: DEFAULT_PARENTS[key] ?? null };
    const nextViews = { ...views, [role.id]: [...(DEFAULT_VIEWS[key] || [])] };
    setGrants(nextGrants);
    setParents(nextParents);
    setViews(nextViews);
    stateRef.current.grants = nextGrants;
    stateRef.current.parents = nextParents;
    stateRef.current.views = nextViews;
    try {
      const parentKey = nextParents[role.id];
      const parentRole = apiRoles.find((r) => roleUiKey(r) === parentKey);
      const updated = await updateAccessRole(role.dbId, {
        grants: nextGrants[role.id],
        navSections: nextViews[role.id],
        inheritsFromRoleId: parentRole?.id || null,
        dataScope: scopeToApi(ROLE_META[key]?.scope || scope),
      });
      setApiRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setDirty(false);
      onToast("Reset to default");
    } catch (err) {
      onToast(err?.message || "Reset failed");
    }
  }

  async function handleCreateRole({ name, inheritFromRoleId }) {
    try {
      const created = await createAccessRole({
        name,
        inheritFromRoleId: inheritFromRoleId || null,
      });
      await loadRoles();
      setSelectedRole(roleUiKey(created));
      setCreateOpen(false);
      onToast(`Created role “${name}”`);
    } catch (err) {
      onToast(err?.message || "Create failed");
    }
  }

  const canDeleteRole = Boolean(role && !role.system && !role.locked && !ROLE_META[role.roleKey || role.id]);

  async function confirmDeleteRole() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteAccessRole(deleteTarget.dbId);
      onToast(`Deleted role “${deleteTarget.name}”`);
      setDeleteTarget(null);
      await loadRoles();
    } catch (err) {
      onToast(err?.message || "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return <BrandLoader variant="page" label="Loading roles…" />;
  }

  if (error) {
    return (
      <div className="ua-section-bar">
        <span>{error}</span>
        <OrangeButton onClick={loadRoles}>Retry</OrangeButton>
      </div>
    );
  }

  if (!role) {
    return <p className="ua-page-head__sub">No console roles found. Open this page again to seed baselines.</p>;
  }

  return (
    <>
      <div className="ua-ac-roles-bar">
        <div className="ua-ac-roles-bar__head">
          <div className="ua-ac-roles-bar__label">Roles</div>
          <div className="ua-ac-roles-bar__actions">
            <p className="ua-ac-roles-bar__hint">
              Edits apply at once to every member holding the role, unless they carry a personal override.
              {dirty ? " Saving…" : ""}
            </p>
            <button type="button" className="ua-ac-btn-outline ua-ac-btn-outline--new" onClick={() => setCreateOpen(true)}>
              + New role
            </button>
          </div>
        </div>

        <div className="ua-ac-role-cards">
          {roleList.map((r) => {
            const g = countGranted(grants, parents, r.id);
            const active = selectedRole === r.id;
            const p = parents[r.id]
              ? ROLE_META[parents[r.id]] || roleList.find((x) => x.id === parents[r.id])
              : null;
            return (
              <button
                key={r.dbId}
                type="button"
                className={`ua-ac-role-card${active ? " ua-ac-role-card--active" : ""}`}
                style={active ? { borderColor: r.color, background: r.bg } : undefined}
                onClick={() => selectRole(r.id)}
              >
                <div className="ua-ac-role-card__top">
                  <span className="ua-ac-role-card__dot" style={{ background: r.color }} />
                  <span className="ua-ac-role-card__name">{r.name}</span>
                  <span className="ua-ac-role-card__pill">
                    {g >= TOTAL_PERM_SLOTS ? `all ${TOTAL_PERM_SLOTS}` : `${g}/${TOTAL_PERM_SLOTS}`}
                  </span>
                </div>
                <div className="ua-ac-role-card__meta">
                  {r.memberCount} members · {r.scope}
                </div>
                {p ? (
                  <div className="ua-ac-role-card__inherit">↳ inherits {p.name}</div>
                ) : r.id === "admin" ? (
                  <div className="ua-ac-role-card__inherit ua-ac-role-card__inherit--muted">system · locked</div>
                ) : (
                  <div className="ua-ac-role-card__inherit ua-ac-role-card__inherit--muted">standalone</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ua-ac-role-detail">
        <div className="ua-ac-role-detail__head">
          <div className="ua-ac-role-detail__intro">
            <span className="ua-ac-role-chip" style={{ background: role.bg, color: role.color, borderColor: role.bd }}>
              {role.name}
            </span>
            {role.system ? <span className="ua-ac-tag">System role · {role.locked ? <span className="">Locked</span> : null}</span> : null}
            
            <p className="ua-ac-role-detail__desc">{role.desc}</p>
          </div>
          <div className="ua-ac-role-detail__controls">
              <div style={{ fontSize: "11.5px", color: "rgb(138, 151, 172)", fontWeight: "650" }} >Data scope</div>
            <div className="ua-ac-scope">
              {["All", "Team", "Assigned"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ua-ac-scope__btn${scope === s ? " ua-ac-scope__btn--active" : ""}`}
                  onClick={() => handleScopeChange(s)}
                  disabled={role.locked}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="ua-ac-btn-ghost" onClick={resetRole} disabled={role.locked}>
              Reset to default
            </button>
            {canDeleteRole ? (
              <button
                type="button"
                className="ua-ac-btn-ghost ua-ac-btn-ghost--danger"
                onClick={() => setDeleteTarget(role)}
              >
                Delete role
              </button>
            ) : null}
          </div>
        </div>

        <div className="ua-ac-inherit">
          <span className="ua-ac-inherit__label" style={{color:"rgb(94, 106, 210)"}}>Inherits from</span>
          <select
            className="ua-ac-inherit__select"
            value={parents[role.id] || ""}
            disabled={role.locked}
            onChange={(e) => handleParentChange(e.target.value)}
          >
            <option value="">Nothing — standalone</option>
            {roleList
              .filter((r) => r.id !== role.id)
              .map((r) => (
                <option key={r.dbId} value={r.id}>
                  Inherit from {r.name}
                </option>
              ))}
          </select>
          <span className="ua-ac-inherit__hint">
            {parentMeta
              ? `Starts from every ${parentMeta.name} permission, then adds ${delta.added} and removes ${delta.removed}. Change ${parentMeta.name} and this role follows.`
              : role.id === "admin"
                ? "Admin is the root role — every permission is granted and locked."
                : "Standalone baseline. No parent permissions flow into this role."}
          </span>
        </div>

        <div className="ua-ac-stats">
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Members</div>
            <div className="ua-ac-stat__value">{role.memberCount}</div>
            <div className="ua-ac-stat__sub">on this baseline</div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Permissions</div>
            <div className="ua-ac-stat__value">
              {granted} <span>/ {TOTAL_PERM_SLOTS}</span>
            </div>
            <div className="ua-ac-stat__sub">granted by this role</div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">{delta.standalone ? "Inheritance" : "Vs parent"}</div>
            <div className="ua-ac-stat__value">
              {delta.standalone ? "Standalone" : `+${delta.added} / −${delta.removed}`}
            </div>
            <div className="ua-ac-stat__sub">
              {delta.standalone ? "no parent role" : `on top of ${parentMeta?.name || "parent"}`}
            </div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Sections</div>
            <div className="ua-ac-stat__value">
              {openSections} <span>/ {AC_SECTIONS.length}</span>
            </div>
            <div className="ua-ac-stat__sub">openable in the left nav</div>
          </div>
        </div>
      </div>

      <div className="ua-ac-split">
        <aside className="ua-ac-sections">
          <div className="ua-ac-sections__head">
            <div className="ua-ac-sections__title">Sections</div>
            <p className="ua-ac-sections__hint">
              Tap a section to filter the matrix. The tick opens or closes it in the left navigation.
            </p>
          </div>
          <button
            type="button"
            className={`ua-ac-section${activeSection == null ? " ua-ac-section--filter" : ""}`}
            onClick={() => setActiveSection(null)}
          >
            <span className="ua-ac-section__name">All sections</span>
            <span className="ua-ac-section__count">
              {granted}/{TOTAL_PERM_SLOTS}
            </span>
          </button>
          {sections.map((sec) => (
            <div
              key={sec.id}
              className={`ua-ac-section${activeSection === sec.id ? " ua-ac-section--filter" : ""}${
                sec.open ? " ua-ac-section--open" : ""
              }`}
            >
              <button type="button" className="ua-ac-section__main" onClick={() => setActiveSection(sec.id)}>
                <span className="ua-ac-section__name">{sec.label}</span>
                <span className="ua-ac-section__count">
                  {sec.granted}/{sec.total}
                </span>
              </button>
              <button
                type="button"
                className={`ua-ac-section__tick${sec.open ? " ua-ac-section__tick--on" : ""}`}
                title={sec.open ? "Hide from nav" : "Show in nav"}
                onClick={() => toggleSectionNav(sec.id)}
              >
                {sec.open ? "✓" : "×"}
              </button>
            </div>
          ))}
        </aside>

        <div className="ua-ac-matrix">
          <div className="ua-ac-matrix__head">
            <div>
              <div className="ua-ac-matrix__title">Permission baseline</div>
              <p className="ua-ac-matrix__hint">Tap a toggle to grant or revoke. Dashes mean the action does not apply.</p>
            </div>
            <div className="ua-ac-legend">
              <span>
                <i className="ua-ac-legend__swatch ua-ac-legend__swatch--inherited" /> Inherited
              </span>
              <span>
                <i className="ua-ac-legend__swatch ua-ac-legend__swatch--added" /> Added here
              </span>
              <span>
                <i className="ua-ac-legend__swatch ua-ac-legend__swatch--removed" /> Removed here
              </span>
            </div>
          </div>

          <div className="ua-ac-matrix__scroll">
            <div className="ua-ac-matrix__cols">
              <div className="ua-ac-matrix__col-label">Permission</div>
              {PERM_ACTS.map((a) => (
                <div key={a} className="ua-ac-matrix__col-act">
                  {a}
                </div>
              ))}
              <div className="ua-ac-matrix__col-granted">Granted</div>
            </div>

            {matrixRows.map((group) => (
              <div key={group.label} className="ua-ac-matrix__group">
                <div className="ua-ac-matrix__group-label">{group.label}</div>
                {group.features.map((row) => {
                  const [, name, fid, acts] = row;
                  const gCount = featureGrantedCount(grants, parents, role.id, fid, acts);
                  return (
                    <div key={fid} className="ua-ac-matrix__row">
                      <div className="ua-ac-matrix__perm">
                        <span className="ua-ac-matrix__perm-name">{name}</span>
                        {gCount === 0 ? <span className="ua-ac-matrix__none">None</span> : null}
                        {gCount === acts.length && gCount > 0 ? <span className="ua-ac-matrix__all">All</span> : null}
                      </div>
                      {PERM_ACTS.map((act) => {
                        const applicable = acts.includes(act);
                        const kind = cellKind(grants, parents, role.id, fid, act, applicable);
                        return (
                          <div key={act} className="ua-ac-matrix__cell">
                            <ToggleSwitch
                              kind={kind}
                              disabled={role.locked}
                              onClick={() => handleToggle(fid, act)}
                            />
                          </div>
                        );
                      })}
                      <div className="ua-ac-matrix__granted">
                        <span className={`ua-ac-granted-pill${gCount > 0 ? " ua-ac-granted-pill--on" : ""}`}>
                          {gCount}/{acts.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {createOpen ? (
        <CreateRoleModal
          roles={roleList}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateRole}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="ua-dialog-backdrop"
          onClick={() => !deleteBusy && setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="ua-dialog ua-dialog--danger"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-access-role-title"
          >
            <div className="ua-dialog__head">
              <div id="delete-access-role-title" className="ua-dialog__title">
                Delete “{deleteTarget.name}”?
              </div>
            </div>
            <p className="ua-dialog__body">
              System roles (Admin, Wellness Coach, Assistant WC, Trainee, Support) stay. This removes the
              custom Access Control role only. Members still assigned to it must be moved first.
            </p>
            <div className="ua-dialog__actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-dialog__btn-danger"
                onClick={confirmDeleteRole}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting…" : "Delete role"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function memberRoleMeta(roleKey, rolesByKey) {
  const live = rolesByKey?.[roleKey];
  const fallback = ROLE_META[roleKey] || ROLE_META.admin;
  return {
    name: live?.name || fallback.name,
    color: live?.color || fallback.color,
    bg: live?.bg || fallback.bg,
    bd: live?.bd || fallback.bd,
  };
}

function effectivePermSubtext(member) {
  const bundles = Number(member.policyBundleCount) || 0;
  if (bundles === 1) return "1 policy bundle applied";
  if (bundles > 1) return `${bundles} policy bundles applied`;
  if (member.hasOverrides) return "personal overrides";
  return "role baseline only";
}

function MembersTab({ onToast }) {
  const navigate = useNavigate();
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [baseTotal, setBaseTotal] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const rolesByKey = useMemo(() => {
    const map = {};
    for (const r of roleOptions) {
      if (r.id) map[r.id] = r;
      if (r.roleKey) map[r.roleKey] = r;
    }
    return map;
  }, [roleOptions]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const roles = await fetchAccessRoles();
        if (!cancelled) setRoleOptions(Array.isArray(roles) ? roles : []);
      } catch {
        if (!cancelled) setRoleOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { pagination: p } = await fetchAccessMembers({ page: 1, limit: 1 });
        if (!cancelled) setBaseTotal(Number(p?.total) || 0);
      } catch {
        if (!cancelled) setBaseTotal(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const { members: rows, pagination: nextPagination } = await fetchAccessMembers({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search || undefined,
        roleKey: roleFilter || undefined,
      });
      setMembers(rows || []);
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || PAGE_SIZE,
        total: Number(nextPagination?.total) || 0,
        pages: Math.max(1, Number(nextPagination?.pages) || 1),
      });
      if (!search && !roleFilter) {
        setBaseTotal(Number(nextPagination?.total) || 0);
      }
    } catch (err) {
      setError(err?.message || "Failed to load members");
      setMembers([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    if (loading || error) return;
    if (page > pagination.pages) setPage(pagination.pages);
  }, [error, loading, page, pagination.pages]);

  const assignableRoles = useMemo(() => {
    if (roleOptions.length) {
      return roleOptions
        .map((r) => ({
          id: r.id || r.roleKey,
          roleKey: r.roleKey || "",
          name: r.name || ROLE_META[r.roleKey]?.name || r.roleKey || r.id,
        }))
        .filter((r) => r.id);
    }
    return ROLE_ORDER.map((id) => ({ id, name: ROLE_META[id]?.name || id }));
  }, [roleOptions]);

  async function handleRoleChange(member, selectedRoleId) {
    if (member.isSuperAdmin) {
      onToast("Super Admin role is locked");
      return;
    }
    const nextRole = assignableRoles.find((role) => String(role.id) === String(selectedRoleId));
    const currentRoleId = String(member.consoleRoleId || member.primaryRoleKey || "");
    if (!nextRole || String(selectedRoleId) === currentRoleId) return;
    setBusyId(member.id);
    try {
      await setAccessMemberRole(member.id, {
        consoleRoleId: nextRole.id,
        roleKey: nextRole.roleKey || undefined,
      });
      onToast(`Updated ${member.name}`);
      await load(page);
    } catch (err) {
      onToast(err?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function openPermissions(memberId) {
    navigate(`${UPDATED_ADMIN_PATHS.teams}/${memberId}?focus=permissions`);
  }

  const totalLabel = `${pagination.total} of ${baseTotal || pagination.total} members`;

  const roleSelectOptions = useMemo(
    () => assignableRoles.map((r) => ({ value: r.id, label: r.name })),
    [assignableRoles],
  );
  const roleFilterOptions = useMemo(
    () => [{ value: "", label: "All roles" }, ...roleSelectOptions],
    [roleSelectOptions],
  );

  return (
    <div className="ua-ac-members">
      <div className="ua-ac-members-toolbar">
        <div className="ua-search-wrap">
          <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="ua-search-wrap__input"
            placeholder="Search a member by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search members"
          />
        </div>
        <CfgSelect
          className="ua-ac-members-toolbar__select"
          options={roleFilterOptions}
          value={roleFilter}
          onChange={setRoleFilter}
          ariaLabel="Filter by role"
          placeholder="All roles"
        />
        <div className="ua-ac-members-toolbar__count">{totalLabel}</div>
      </div>

      {loading ? <BrandLoader variant="page" label="Loading members…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={() => load(page)}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error ? (
        <TableScroll>
          <div className="ua-table-card ua-table-card--ac-members">
            <div className="ua-table ua-table--ac-members ua-table__head">
              <div>Member</div>
              <div>Assigned role</div>
              <div>Effective permissions</div>
              <div>Overrides</div>
              <div>Fine-tune</div>
            </div>
            {members.length === 0 ? (
              <div className="ua-table ua-table--ac-members ua-table__row">
                <div className="ua-table__muted" style={{ gridColumn: "1 / -1" }}>
                  No members match this filter.
                </div>
              </div>
            ) : null}
            {members.map((m) => {
              const roleKey = m.primaryRoleKey || "admin";
              const currentRoleId = m.consoleRoleId || roleKey;
              const meta = memberRoleMeta(roleKey, rolesByKey);
              const granted = typeof m.grantedCount === "number" ? m.grantedCount : 0;
              const total = typeof m.totalSlots === "number" && m.totalSlots > 0 ? m.totalSlots : TOTAL_PERM_SLOTS;
              const pct = Math.max(0, Math.min(100, Math.round((granted / total) * 100)));
              return (
                <div key={m.id} className="ua-table ua-table--ac-members ua-table__row">
                  <div className="ua-user-cell">
                    <span
                      className="ua-avatar ua-avatar--staff"
                      style={{
                        background: meta.color,
                        color: "#fff",
                        borderColor: meta.color,
                      }}
                    >
                      {staffInitials(m.name)}
                    </span>
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name">{m.name}</div>
                      <div className="ua-user-cell__sub ua-user-cell__email">{m.email}</div>
                    </div>
                  </div>
                  <div data-label="Assigned role">
                    {m.isSuperAdmin ? (
                      <span
                        className="ua-role-chip"
                        style={{ background: meta.bg, color: meta.color, borderColor: meta.bd }}
                      >
                        {meta.name}
                      </span>
                    ) : (
                      <CfgSelect
                        className="ua-ac-role-select"
                        options={[
                          ...(!roleSelectOptions.some((r) => String(r.value) === String(currentRoleId))
                            ? [{ value: currentRoleId, label: meta.name }]
                            : []),
                          ...roleSelectOptions,
                        ]}
                        value={currentRoleId}
                        disabled={busyId === m.id}
                        onChange={(value) => handleRoleChange(m, value)}
                        ariaLabel={`Role for ${m.name}`}
                        placeholder="Choose role"
                      />
                    )}
                  </div>
                  <div data-label="Effective permissions">
                    <div className="ua-ac-eff">
                      <div className="ua-ac-eff__count">
                        {granted}/{total}
                      </div>
                      <div className="ua-ac-eff__track" aria-hidden="true">
                        <div
                          className="ua-ac-eff__fill"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                      <div className="ua-ac-eff__sub">{effectivePermSubtext(m)}</div>
                    </div>
                  </div>
                  <div data-label="Overrides">
                    <span className={`ua-ac-override${m.hasOverrides ? " ua-ac-override--custom" : ""}`}>
                      {m.hasOverrides ? "Personal" : "Role default"}
                    </span>
                  </div>
                  <div className="ua-ac-members-actions" data-label="Fine-tune">
                    <button
                      type="button"
                      className="ua-ac-fine-tune"
                      onClick={() => openPermissions(m.id)}
                    >
                      Permissions ›
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TableScroll>
      ) : null}

      {!loading && !error ? (
        <ListPagination
          page={page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Access members pagination"
        />
      ) : null}
    </div>
  );
}

function ApprovalsTab({ onToast, onCountChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { requests: rows } = await fetchAccessApprovals({ status: "pending", limit: 50 });
      const list = Array.isArray(rows) ? rows : [];
      setRequests(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(err?.message || "Failed to load approvals");
      setRequests([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id, action) {
    setBusyId(id);
    try {
      if (action === "approve") await approveAccessRequest(id);
      else await rejectAccessRequest(id);
      onToast(action === "approve" ? "Approved — permission granted" : "Rejected");
      await load();
    } catch (err) {
      onToast(err?.message || "Update failed");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="ua-approvals">
      <p className="ua-page-head__sub">Permission and role requests raised by a Wellness Coach land here.</p>
      {loading ? <BrandLoader variant="page" label="Loading requests…" /> : null}
      {error ? <p className="ua-table__muted">{error}</p> : null}
      {!loading && !error && requests.length === 0 ? (
        <p className="ua-table__muted">No pending permission requests.</p>
      ) : null}
      {requests.map((a) => (
        <div key={a.id} className="ua-approval-card">
          <span className="ua-approval-card__kind">{a.kind}</span>
          <div className="ua-approval-card__copy">
            <div className="ua-approval-card__title">{a.title}</div>
            <div className="ua-approval-card__meta">{a.meta}</div>
          </div>
          <div className="ua-approval-card__actions">
            <button
              type="button"
              className="ua-reject-btn"
              disabled={Boolean(busyId)}
              onClick={() => decide(a.id, "reject")}
            >
              {busyId === a.id ? "…" : "Reject"}
            </button>
            <button
              type="button"
              className="ua-green-btn"
              disabled={Boolean(busyId)}
              onClick={() => decide(a.id, "approve")}
            >
              {busyId === a.id ? "…" : "Approve"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAuditWhen(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const AUDIT_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "role", label: "Role changes" },
  { value: "permission", label: "Permission changes" },
  { value: "activity", label: "Activity" },
];

const AUDIT_TEXT_MAX = 50;

function TruncateHover({ text, className = "" }) {
  const value = text == null || String(text).trim() === "" ? "—" : String(text);
  const overflow = value !== "—" && value.length > AUDIT_TEXT_MAX;
  const display = overflow ? `${value.slice(0, AUDIT_TEXT_MAX)}…` : value;
  const [tip, setTip] = useState(null);

  function placeTip(el) {
    if (!el || !overflow) return;
    const r = el.getBoundingClientRect();
    const maxW = Math.min(420, Math.max(180, window.innerWidth - 24));
    let left = r.left;
    if (left + maxW > window.innerWidth - 12) left = window.innerWidth - 12 - maxW;
    setTip({ top: r.bottom + 8, left: Math.max(12, left), maxW });
  }

  return (
    <>
      <div
        className={`ua-truncate-tip ${className}`.trim()}
        onMouseEnter={(e) => placeTip(e.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(e) => placeTip(e.currentTarget)}
        onBlur={() => setTip(null)}
        tabIndex={overflow ? 0 : undefined}
      >
        {display}
      </div>
      {tip
        ? createPortal(
            <div
              className="ua-truncate-tip__bubble"
              role="tooltip"
              style={{ top: tip.top, left: tip.left, maxWidth: tip.maxW }}
            >
              {value}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function AuditLogTab() {
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [baseTotal, setBaseTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const { entries: rows, pagination: nextPagination } = await fetchAccessAuditLog({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search || undefined,
        kind: typeFilter || undefined,
      });
      setEntries(rows || []);
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || PAGE_SIZE,
        total: Number(nextPagination?.total) || 0,
        pages: Math.max(1, Number(nextPagination?.pages) || 1),
      });
      if (!search && !typeFilter) {
        setBaseTotal(Number(nextPagination?.total) || 0);
      }
    } catch (err) {
      setError(err?.message || "Failed to load audit log");
      setEntries([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    if (loading || error) return;
    if (page > pagination.pages) setPage(pagination.pages);
  }, [error, loading, page, pagination.pages]);

  const countLabel = `${pagination.total} of ${baseTotal || pagination.total} ${pagination.total === 1 ? "entry" : "entries"}`;

  return (
    <div className="ua-audit">
      <p className="ua-page-head__sub">
        Every access change and staff activity, newest first. Requests, approvals, rejections, direct admin edits and what each member did.
      </p>
      <div className="ua-ac-members-toolbar">
        <div className="ua-search-wrap">
          <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="ua-search-wrap__input"
            placeholder="Search name, user ID, phone, coach or event"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search audit log"
          />
        </div>
        <CfgSelect
          className="ua-ac-members-toolbar__select"
          options={AUDIT_TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
          ariaLabel="Filter audit log by type"
          placeholder="All types"
        />
        <div className="ua-ac-members-toolbar__count">{countLabel}</div>
      </div>

      {loading ? <BrandLoader variant="page" label="Loading audit log…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={() => load(page)}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error ? (
        <TableScroll>
          <div className="ua-table-card ua-table-card--audit">
            <div className="ua-table ua-table--audit ua-table__head">
              <div>Type</div>
              <div>Event</div>
              <div>Subject</div>
              <div>Actor</div>
              <div>When</div>
            </div>
            {entries.length === 0 ? (
              <div className="ua-table ua-table--audit ua-table__row">
                <div className="ua-table__muted" style={{ gridColumn: "1 / -1" }}>
                  No audit entries match this filter.
                </div>
              </div>
            ) : null}
            {entries.map((entry) => (
              <div key={entry.id} className="ua-table ua-table--audit ua-table__row">
                <div data-label="Type">
                  <span className={`ua-log-kind ua-log-kind--${(entry.kindKey || entry.kind || "activity").toLowerCase()}`}>
                    {entry.kind}
                  </span>
                </div>
                <div data-label="Event">
                  <TruncateHover className="ua-log-text" text={entry.text} />
                  {entry.detail ? <TruncateHover className="ua-log-detail" text={entry.detail} /> : null}
                </div>
                <div data-label="Subject">
                  <TruncateHover className="ua-log-subject" text={entry.subject} />
                  {entry.subjectMeta ? <TruncateHover className="ua-log-detail" text={entry.subjectMeta} /> : null}
                </div>
                <div data-label="Actor">
                  <TruncateHover className="ua-log-actor" text={entry.actor} />
                </div>
                <div className="ua-log-when" data-label="When">{formatAuditWhen(entry.createdAt)}</div>
              </div>
            ))}
          </div>
        </TableScroll>
      ) : null}

      {!loading && !error ? (
        <ListPagination
          page={page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Audit log pagination"
        />
      ) : null}
    </div>
  );
}

function SimulatorTab() {
  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState("wc");
  const [apiRoles, setApiRoles] = useState([]);
  const [grants, setGrants] = useState(cloneGrants());
  const [parents, setParents] = useState({ ...DEFAULT_PARENTS });
  const [views, setViews] = useState({ ...DEFAULT_VIEWS });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const roles = await fetchAccessRoles();
        if (cancelled) return;
        const list = Array.isArray(roles) && roles.length ? roles : [];
        setApiRoles(list);
        if (list.length) {
          setGrants(rolesToGrantsState(list));
          setParents(rolesToParentsState(list));
          setViews(rolesToViewsState(list));
          setRoleId((prev) => (list.some((r) => roleUiKey(r) === prev) ? prev : roleUiKey(list.find((r) => r.roleKey === "wc") || list[0])));
        }
      } catch {
        if (!cancelled) setApiRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleList = useMemo(() => {
    const mapped = mapApiRolesToUi(apiRoles);
    if (mapped.length) return mapped;
    return ROLE_ORDER.map((id) => ({
      id,
      name: ROLE_META[id]?.name || id,
      scope: ROLE_META[id]?.scope || "All",
    }));
  }, [apiRoles]);

  const role = roleList.find((r) => r.id === roleId) || roleList[0];
  const roleName = role?.name || "this role";
  const granted = role ? countGranted(grants, parents, role.id) : 0;
  const navOpen = role ? views[role.id] || DEFAULT_VIEWS[role.id] || [] : [];
  const selectOptions = roleList.map((r) => ({
    value: r.id,
    label: `${r.name} (role baseline)`,
  }));

  const rows = useMemo(() => {
    if (!role) return [];
    return PERM_CATALOG.map((entry) => {
      const [, featureName, featureId, actions] = entry;
      const allowed = actions.filter((act) => roleHas(grants, parents, role.id, featureId, act));
      const visible = allowed.includes("view") || allowed.length > 0;
      return {
        featureId,
        featureName,
        actions,
        allowed,
        visible,
        reason: visible
          ? "role baseline allows it, no override in play"
          : `hidden — not in the ${roleName} baseline.`,
      };
    });
  }, [grants, parents, role, roleName]);

  return (
    <div className="ua-sim">
      <section className="ua-sim-panel">
        <div className="ua-sim-panel__head">
          <span className="ua-sim-panel__label">Previewing access as</span>
          <CfgSelect
            className="ua-sim-select"
            options={selectOptions}
            value={role?.id || ""}
            disabled={loading}
            onChange={setRoleId}
            ariaLabel="Preview role"
            placeholder="Choose a role"
          />
          <span className="ua-sim-scope">scope: {role?.scope || "All"}</span>
          <span className="ua-sim-meta">
            {loading ? "Loading…" : `${granted} of ${TOTAL_PERM_SLOTS} actions available · baseline only`}
          </span>
        </div>
      </section>

      <section className="ua-sim-panel">
        <h3 className="ua-sim-panel__title">Left navigation they would see</h3>
        <div className="ua-sim-nav">
          {AC_SECTIONS.map((sec) => {
            const open = navOpen.includes(sec.id);
            return (
              <span key={sec.id} className={`ua-sim-nav__pill${open ? " is-on" : ""}`}>
                {sec.label}
              </span>
            );
          })}
        </div>
      </section>

      <section className="ua-sim-panel">
        <h3 className="ua-sim-panel__title">What they can do, and why</h3>
        <div className="ua-sim-list">
          {rows.map((row) => (
            <div key={row.featureId} className={`ua-sim-row${row.visible ? " is-on" : ""}`}>
              <span className={`ua-sim-row__icon${row.visible ? " ua-sim-row__icon--ok" : ""}`} aria-hidden="true">
                {row.visible ? "👁" : "🔒"}
              </span>
              <div className="ua-sim-row__body">
                <div className="ua-sim-row__feature">{row.featureName}</div>
                <div className="ua-sim-row__reason">{row.reason}</div>
              </div>
              <div className="ua-sim-acts">
                {row.actions.map((act) => {
                  const on = row.allowed.includes(act);
                  return (
                    <span
                      key={act}
                      className={`ua-sim-act${on ? (act === "view" ? " is-on" : " is-write") : ""}`}
                    >
                      {act}
                    </span>
                  );
                })}
              </div>
              <span className={`ua-sim-pill${row.visible ? " ua-sim-pill--ok" : ""}`}>
                {row.visible ? "Visible" : "Hidden"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AccessPage() {
  const { showToast: onToast } = useOutletContext();
  const { isSuperAdmin, bootstrapping } = useViewAs();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = ACCESS_TABS.some((item) => item.id === tabParam) ? tabParam : "roles";
  const setTab = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (!nextTab || nextTab === "roles") next.delete("tab");
    else next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  };
  const [pendingCount, setPendingCount] = useState(0);

  const loadPendingCount = useCallback(async () => {
    try {
      const { pagination, requests } = await fetchAccessApprovals({ status: "pending", limit: 1 });
      setPendingCount(pagination?.total ?? (requests || []).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin || bootstrapping) return;
    loadPendingCount();
  }, [isSuperAdmin, bootstrapping, loadPendingCount]);

  const tabs = useMemo(
    () =>
      ACCESS_TABS.map((item) =>
        item.id === "approvals" && pendingCount > 0 ? { ...item, badge: pendingCount } : item,
      ),
    [pendingCount],
  );

  if (bootstrapping) {
    return (
      <main className="content ua-page-enter">
        <BrandLoader variant="page" label="Loading…" />
      </main>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  return (
    <main className="content ua-page-enter ua-ac-page">
      <PageHeader
        title="Access Control"
        subtitle={
          <>
            Role baselines, per-user overrides and attachable policies. Precedence:{" "}
            <b style={{ color: "#16233f" }}>user override</b>
            {" > "}
            <b style={{ color: "#d64545" }}>policy deny</b>
            {" > "}
            <b style={{ color: "#2b8f5b" }}>policy allow</b>
            {" > "}
            role default.
          </>
        }
        autosave
        onAutosave={() => onToast("Saved")}
      />

      <PillTabs tabs={tabs} active={tab} onChange={setTab} size="lg" />

      {tab === "roles" ? <RolesPermissionsTab onToast={onToast} /> : null}
      {tab === "members" ? <MembersTab onToast={onToast} /> : null}

      {tab === "policies" ? <PoliciesTab onToast={onToast} /> : null}

      {tab === "simulator" ? <SimulatorTab /> : null}

      {tab === "approvals" ? (
        <ApprovalsTab onToast={onToast} onCountChange={setPendingCount} />
      ) : null}

      {tab === "audit" ? <AuditLogTab /> : null}
    </main>
  );
}
