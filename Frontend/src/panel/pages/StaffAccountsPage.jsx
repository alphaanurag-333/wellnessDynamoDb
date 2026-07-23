import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AdminListHeader, AdminPageHeader, AdminStatusBadge, listCountSubtitle } from "../../admin/components/AdminCrud.jsx";
import {
  createStaffAccount,
  deleteStaffAccount,
  fetchStaffAccounts,
  updateStaffAccount,
} from "../api/staffAccounts.js";
import { fetchStaffRoles } from "../api/staffRoles.js";
import { fetchActiveSpecializations } from "../api/staffSpecializations.js";
import { selectStaffAccount as selectMyStaffAccount, selectStaffToken } from "../../store/staffAuthSelectors.js";

const ACCOUNT_TYPES = [
  { value: "admin", label: "Admin" },
  { value: "wellness_coach", label: "Wellness Coach" },
  { value: "assistant_wellness_coach", label: "Assistant Wellness Coach" },
  { value: "staff", label: "Staff (custom role)" },
];
const ACCOUNT_TYPE_LABELS = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.value, t.label]));

const EMPTY_FORM = {
  id: null,
  accountType: "admin",
  name: "",
  email: "",
  phone: "",
  phoneCountryCode: "+91",
  password: "",
  status: "active",
  isSuperAdmin: false,
  roleId: "",
  specializationId: "",
  wellnessCoachId: "",
  designation: "",
  allowNoRole: false,
};

export function StaffAccountsPage() {
  const token = useSelector(selectStaffToken);
  const myAccount = useSelector(selectMyStaffAccount);
  const [view, setView] = useState("list");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [specializationOptions, setSpecializationOptions] = useState([]);
  const [coachOptions, setCoachOptions] = useState([]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStaffAccounts(token, {
        search: search || undefined,
        accountType: typeFilter || undefined,
        limit: 200,
      });
      setAccounts(data?.accounts || []);
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not load staff accounts", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [token, search, typeFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Every role is now assignable to every account type (no account-type
  // restriction on the catalog) — the dropdown always offers the full
  // active-role list regardless of which account type is selected above.
  const loadRoleOptions = useCallback(async () => {
    try {
      const data = await fetchStaffRoles(token, { status: "active", limit: 200 });
      setRoleOptions(data?.roles || []);
    } catch {
      setRoleOptions([]);
    }
  }, [token]);

  const loadSpecializations = useCallback(async () => {
    try {
      setSpecializationOptions(await fetchActiveSpecializations());
    } catch {
      setSpecializationOptions([]);
    }
  }, []);

  const loadCoachOptions = useCallback(async () => {
    try {
      const data = await fetchStaffAccounts(token, { accountType: "wellness_coach", limit: 200 });
      setCoachOptions(data?.accounts || []);
    } catch {
      setCoachOptions([]);
    }
  }, [token]);

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setView("form");
    await loadRoleOptions();
  };

  const openEdit = async (account) => {
    setForm({
      id: account.id,
      accountType: account.accountType,
      name: account.name || "",
      email: account.email || "",
      phone: account.phone || "",
      phoneCountryCode: account.phoneCountryCode || "+91",
      password: "",
      status: account.status || "active",
      isSuperAdmin: Boolean(account.isSuperAdmin),
      roleId: account.roleId || "",
      specializationId: account.specializationId || "",
      wellnessCoachId: account.wellnessCoachId || "",
      designation: account.designation || "",
      allowNoRole: true,
    });
    setView("form");
    await loadRoleOptions();
    if (account.accountType === "wellness_coach") await loadSpecializations();
    if (account.accountType === "assistant_wellness_coach") await loadCoachOptions();
  };

  const backToList = () => setView("list");

  const handleAccountTypeChange = async (value) => {
    setForm((prev) => ({ ...prev, accountType: value, isSuperAdmin: false, roleId: "" }));
    if (value === "wellness_coach") await loadSpecializations();
    if (value === "assistant_wellness_coach") await loadCoachOptions();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.accountType === "staff" && !form.roleId) {
      return Swal.fire({
        icon: "warning",
        title: "Role is required",
        text: "Staff accounts have no default access — choose a role before saving.",
      });
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        phoneCountryCode: form.phoneCountryCode,
        status: form.status,
      };
      if (!form.id) {
        payload.password = form.password;
        if (form.accountType === "admin") payload.isSuperAdmin = form.isSuperAdmin;
        if (!form.isSuperAdmin || form.accountType !== "admin") {
          if (form.roleId) payload.roleId = form.roleId;
          else payload.allowNoRole = true;
        }
        if (form.accountType === "wellness_coach") payload.specializationId = form.specializationId;
        if (form.accountType === "assistant_wellness_coach") payload.wellnessCoachId = form.wellnessCoachId;
        await createStaffAccount(token, form.accountType, payload);
      } else {
        if (form.password) payload.password = form.password;
        if (!form.isSuperAdmin) payload.roleId = form.roleId || null;
        if (form.accountType === "wellness_coach") payload.specializationId = form.specializationId;
        if (form.accountType === "assistant_wellness_coach") payload.designation = form.designation;
        await updateStaffAccount(token, form.id, payload);
      }
      await Swal.fire({ icon: "success", title: form.id ? "Account updated" : "Account created", timer: 1400 });
      setView("list");
      loadAccounts();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not save account", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account) => {
    if (account.isSuperAdmin) return;
    if (account.id === myAccount?.id) return;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `Delete "${account.name}"?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await deleteStaffAccount(token, account.id);
      loadAccounts();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not delete account", text: err.message });
    }
  };

  const filteredRoleOptions = useMemo(() => roleOptions, [roleOptions]);

  if (view === "form") {
    return (
      <div className="user-page">
        <AdminPageHeader
          title={form.id ? "Edit staff account" : "New staff account"}
          subtitle="Admin, Wellness Coach, Assistant Wellness Coach and custom Staff accounts all live in one place."
          onBack={backToList}
        />
        <div className="page-card">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Account type</span>
                <select
                  className="user-field__input"
                  value={form.accountType}
                  onChange={(e) => handleAccountTypeChange(e.target.value)}
                  disabled={Boolean(form.id)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Status</span>
                <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Name <span className="required-dot">*</span>
                </span>
                <input className="user-field__input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Email <span className="required-dot">*</span>
                </span>
                <input
                  type="email"
                  className="user-field__input"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </label>

              <label className="user-field col-12 col-md-3">
                <span className="user-field__label">Dial code</span>
                <input
                  className="user-field__input"
                  value={form.phoneCountryCode}
                  onChange={(e) => setForm((p) => ({ ...p, phoneCountryCode: e.target.value }))}
                />
              </label>
              <label className="user-field col-12 col-md-3">
                <span className="user-field__label">Phone</span>
                <input
                  className="user-field__input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                />
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  {form.id ? "New password (leave blank to keep current)" : "Password"}{" "}
                  {form.id ? null : <span className="required-dot">*</span>}
                </span>
                <input
                  type="password"
                  className="user-field__input"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!form.id}
                  autoComplete="new-password"
                />
              </label>

              {form.accountType === "admin" ? (
                <div className="user-field col-12">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={form.isSuperAdmin}
                      disabled={Boolean(form.id)}
                      onChange={(e) => setForm((p) => ({ ...p, isSuperAdmin: e.target.checked }))}
                    />
                    Super Admin (full access, no role needed)
                  </label>
                </div>
              ) : null}

              {!form.isSuperAdmin || form.accountType !== "admin" ? (
                <label className="user-field col-12 col-md-6">
                  <span className="user-field__label">
                    Role
                    {form.accountType === "staff" ? <span className="required-dot"> *</span> : null}
                  </span>
                  <select
                    className="user-field__input"
                    value={form.roleId}
                    onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}
                    required={form.accountType === "staff"}
                  >
                    <option value="" disabled={form.accountType === "staff"}>
                      {form.accountType === "admin"
                        ? "No role (no access)"
                        : form.accountType === "staff"
                          ? "Select a role…"
                          : "No role (full access — legacy default)"}
                    </option>
                    {filteredRoleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {form.accountType === "wellness_coach" ? (
                <label className="user-field col-12 col-md-6">
                  <span className="user-field__label">
                    Specialization <span className="required-dot">*</span>
                  </span>
                  <select
                    className="user-field__input"
                    value={form.specializationId}
                    onChange={(e) => setForm((p) => ({ ...p, specializationId: e.target.value }))}
                    required={!form.id}
                  >
                    <option value="">Select specialization…</option>
                    {specializationOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {form.accountType === "assistant_wellness_coach" ? (
                <>
                  <label className="user-field col-12 col-md-6">
                    <span className="user-field__label">
                      Reports to (Wellness Coach) <span className="required-dot">*</span>
                    </span>
                    <select
                      className="user-field__input"
                      value={form.wellnessCoachId}
                      onChange={(e) => setForm((p) => ({ ...p, wellnessCoachId: e.target.value }))}
                      disabled={Boolean(form.id)}
                      required={!form.id}
                    >
                      <option value="">Select wellness coach…</option>
                      {coachOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="user-field col-12 col-md-6">
                    <span className="user-field__label">Designation</span>
                    <input className="user-field__input" value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
                  </label>
                </>
              ) : null}
            </div>

            <div className="user-form__actions">
              <button type="button" className="btn btn--ghost" onClick={backToList}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? "Saving…" : "Save account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Staff Accounts"
          subtitle={listCountSubtitle(loading, accounts.length, "account", "accounts")}
          actions={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              + New account
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email…"
            />
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Account type</span>
            <select className="user-field__input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Account type</th>
                <th>Role</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-table__muted">
                    No staff accounts yet.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <div className="data-table__muted">{account.email}</div>
                    </td>
                    <td>{ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</td>
                    <td className="data-table__muted">
                      {account.isSuperAdmin ? "Super Admin" : account.roleId ? "Assigned" : "—"}
                    </td>
                    <td>
                      <AdminStatusBadge status={account.status} />
                    </td>
                    <td className="data-table__actions-col">
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(account)}>
                          Edit
                        </button>
                        {!account.isSuperAdmin && account.id !== myAccount?.id ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ color: "#b91c1c" }}
                            onClick={() => handleDelete(account)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
