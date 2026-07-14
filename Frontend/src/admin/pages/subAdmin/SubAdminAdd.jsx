import { useEffect, useId, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateSubAdmin, adminUpdateSubAdmin } from "../../api/subAdminApi.js";
import { adminListRoles } from "../../api/roleApi.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import {
  PHONE_NATIONAL_LEN,
  INDIAN_MOBILE_INPUT_PATTERN,
  blockIndianMobileFirstDigitKeyDown,
  sanitizePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import { validateImageFileSize } from "../../../utils/mediaUploadValidation.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { NAME_MAX_LEN, emptyForm, getSubAdminId, validateSubAdminForm } from "./SubAdminShared.js";

export function SubAdminForm({ mode = "create", initialSubAdmin = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const fileInputRef = useRef(null);
  const fileInputId = useId();

  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState(() => {
    if (!initialSubAdmin) return emptyForm();
    return {
      name: initialSubAdmin.name || "",
      email: initialSubAdmin.email || "",
      password: "",
      phone: initialSubAdmin.phone || "",
      roleId: initialSubAdmin.roleId || "",
      status: initialSubAdmin.status || "active",
    };
  });
  const editId = isEditMode && initialSubAdmin ? getSubAdminId(initialSubAdmin) : "";

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      try {
        const { roles: list } = await adminListRoles(adminToken, { status: "active", limit: 200 });
        setRoles(list);
      } catch {
        // handled by the required-select validation below
      }
    })();
  }, [adminToken]);

  useEffect(() => {
    if (!profileFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(profileFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateSubAdminForm(form, { isEdit: isEditMode });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateSubAdmin(
          adminToken,
          editId,
          {
            name: form.name,
            phone: form.phone,
            roleId: form.roleId,
            status: form.status,
            ...(form.password ? { password: form.password } : {}),
          },
          profileFile
        );
        await Swal.fire({ icon: "success", title: "Sub-admin updated", timer: 1500 });
      } else {
        await adminCreateSubAdmin(adminToken, form, profileFile);
        await Swal.fire({ icon: "success", title: "Sub-admin created", timer: 1500 });
      }
      navigate("/admin/sub-admins");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save sub-admin." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="d-flex flex-column flex-sm-row align-items-start gap-3 gap-sm-4 pb-4 mb-4 border-bottom">
        <div className="position-relative flex-shrink-0">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="d-none"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const sizeErr = validateImageFileSize(file);
              if (sizeErr) {
                e.target.value = "";
                await Swal.fire({ icon: "error", title: "Validation error", text: sizeErr });
                return;
              }
              setProfileFile(file);
            }}
          />
          <label htmlFor={fileInputId} className="mb-0 d-block" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle border border-2 overflow-hidden bg-body-secondary d-flex align-items-center justify-content-center"
              style={{ width: 96, height: 96 }}
            >
              <AdminMediaImage
                path={initialSubAdmin?.profileImage}
                src={previewUrl || undefined}
                round
                width={96}
                height={96}
                alt="Profile"
              />
            </div>
            <div className="text-center small text-primary mt-2">Profile picture</div>
          </label>
        </div>
      </div>

      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
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
            disabled={isEditMode}
            required={!isEditMode}
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            {isEditMode ? "New password" : "Password"} {isEditMode ? null : <span className="required-dot">*</span>}
          </span>
          <input
            type="password"
            className="user-field__input"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder={isEditMode ? "Leave blank to keep current password" : ""}
            required={!isEditMode}
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Mobile number <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: sanitizePhoneDigits(e.target.value) }))}
            onKeyDown={blockIndianMobileFirstDigitKeyDown}
            maxLength={PHONE_NATIONAL_LEN}
            minLength={PHONE_NATIONAL_LEN}
            pattern={INDIAN_MOBILE_INPUT_PATTERN}
            placeholder="10-digit mobile number"
            aria-label="Mobile number"
            required
          />
          <span className="user-field__label small text-body-secondary d-block mt-1">
            {PHONE_NATIONAL_LEN}-digit number starting with 6–9.
          </span>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Role <span className="required-dot">*</span>
          </span>
          <select
            className="user-field__input"
            value={form.roleId}
            onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}
            required
          >
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/sub-admins")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update sub-admin" : "Create sub-admin"}
        </button>
      </div>
    </form>
  );
}

export function SubAdminAdd() {
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  if (!isSuperAdmin) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add sub-admin"
        subtitle="Create a new sub-admin and assign them a role."
        backTo="/admin/sub-admins"
      />
      <div className="page-card">
        <SubAdminForm mode="create" />
      </div>
    </div>
  );
}
