import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateSubAdmin, adminUpdateSubAdmin } from "../../api/subAdminApi.js";
import { adminListRoles } from "../../api/roleApi.js";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import {
  PHONE_NATIONAL_LEN,
  INDIAN_MOBILE_INPUT_PATTERN,
  blockIndianMobileFirstDigitKeyDown,
  sanitizePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { NAME_MAX_LEN, emptyForm, getSubAdminId, validateSubAdminForm } from "./SubAdminShared.js";

export function SubAdminForm({ mode = "create", initialSubAdmin = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const fileInputRef = useRef(null);

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
        const { roles: list } = await adminListRoles(adminToken, {
          status: "active",
          limit: 200,
          scope: "ADMIN",
        });
        setRoles(list);
      } catch {
        // handled by the required-select validation below
      }
    })();
  }, [adminToken]);

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
        <AdminImagePicker
          variant="avatar"
          label="Profile picture"
          chooseLabel="Profile picture"
          hint={`Crop to ${ADMIN_IMAGE_PRESETS.profile.width} × ${ADMIN_IMAGE_PRESETS.profile.height}px (max 25 MB). JPEG, PNG, GIF, or WebP.`}
          outputWidth={ADMIN_IMAGE_PRESETS.profile.width}
          outputHeight={ADMIN_IMAGE_PRESETS.profile.height}
          avatarSize={96}
          cropTitle="Crop profile image"
          file={profileFile}
          previewUrl={previewUrl || ""}
          baselinePath={initialSubAdmin?.profileImage || ""}
          inputRef={fileInputRef}
          onChange={({ file, previewUrl: nextPreview }) => {
            if (previewUrl && String(previewUrl).startsWith("blob:") && previewUrl !== nextPreview) {
              URL.revokeObjectURL(previewUrl);
            }
            setProfileFile(file);
            setPreviewUrl(nextPreview || null);
          }}
        />
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
