import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  adminCreateTeamMember,
  adminListTeamParents,
  adminUpdateTeamMember,
} from "../../api/teamApi.js";
import { adminListRoles } from "../../api/roleApi.js";
import { adminListSpecializations } from "../../api/adminSpecializations.js";
import { AdminImagePicker, ADMIN_IMAGE_PRESETS } from "../../components/AdminImagePicker.jsx";
import { logout } from "../../../store/authSlice.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import {
  PHONE_NATIONAL_LEN,
  INDIAN_MOBILE_INPUT_PATTERN,
  blockIndianMobileFirstDigitKeyDown,
  sanitizePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { CopyReferralCode } from "../../../components/ReferralAssignmentShared.jsx";
import { NAME_MAX_LEN, emptyForm, getTeamMemberId, validateTeamForm } from "./TeamShared.js";

export function TeamForm({ mode = "create", initialMember = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [parents, setParents] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState(() => {
    if (!initialMember) return emptyForm();
    return {
      name: initialMember.name || "",
      email: initialMember.email || "",
      password: "",
      phone: initialMember.phone || "",
      roleId: initialMember.roleId || "",
      status: initialMember.status || "active",
      parentAccountId: initialMember.parentAccountId || "",
      specializationId: initialMember.specializationId || "",
      referralCode: initialMember.referralCode || "",
      approvalStatus: initialMember.approvalStatus || "approved",
    };
  });
  const editId = isEditMode && initialMember ? getTeamMemberId(initialMember) : "";

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      try {
        const [{ roles: list }, parentList, { specializations: specs }] = await Promise.all([
          adminListRoles(adminToken, { status: "active", limit: 200 }),
          adminListTeamParents(adminToken),
          adminListSpecializations(adminToken, { status: "active", limit: 200 }),
        ]);
        setRoles(list);
        setParents((parentList || []).filter((p) => p.id !== editId));
        setSpecializations(specs || []);
      } catch (e) {
        if (e?.status === 401) return dispatch(logout());
      }
    })();
  }, [adminToken, dispatch, editId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateTeamForm(form, { isEdit: isEditMode });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        roleId: form.roleId,
        status: form.status,
        parentAccountId: form.parentAccountId || "",
        specializationId: form.specializationId || "",
        approvalStatus: form.approvalStatus || "",
      };

      if (editId) {
        await adminUpdateTeamMember(
          adminToken,
          editId,
          {
            ...payload,
            ...(form.password ? { password: form.password } : {}),
          },
          profileFile
        );
        await Swal.fire({ icon: "success", title: "Team member updated", timer: 1500 });
      } else {
        await adminCreateTeamMember(
          adminToken,
          {
            ...payload,
            email: form.email,
            password: form.password,
          },
          profileFile
        );
        await Swal.fire({ icon: "success", title: "Team member created", timer: 1500 });
      }
      navigate("/admin/team");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: err.message || "Could not save team member.",
      });
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
          baselinePath={initialMember?.profileImage || ""}
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
          <span className="user-field__label">Reports to</span>
          <select
            className="user-field__input"
            value={form.parentAccountId}
            onChange={(e) => setForm((p) => ({ ...p, parentAccountId: e.target.value }))}
          >
            <option value="">None (top-level)</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name} ({parent.email})
              </option>
            ))}
          </select>
          <span className="user-field__label small text-body-secondary d-block mt-1">
            Optional. Set when this member reports to a coach (assistant-style access).
          </span>
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Specialization</span>
          <select
            className="user-field__input"
            value={form.specializationId}
            onChange={(e) => setForm((p) => ({ ...p, specializationId: e.target.value }))}
          >
            <option value="">None</option>
            {specializations.map((spec) => (
              <option key={spec.id || spec._id} value={spec.id || spec._id}>
                {spec.title || spec.name}
              </option>
            ))}
          </select>
        </label>
        {isEditMode ? (
          <div className="user-field col-12 col-md-6">
            <CopyReferralCode
              code={initialMember?.referralCode}
              label="Referral code (auto-generated)"
            />
            <span className="user-field__label small text-body-secondary d-block mt-1">
              Generated automatically for coach / assistant roles. Not editable.
            </span>
          </div>
        ) : (
          <div className="user-field col-12 col-md-6">
            <span className="user-field__label">Referral code</span>
            <input
              className="user-field__input"
              value=""
              disabled
              placeholder="Auto-generated on save for care roles"
            />
          </div>
        )}
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Approval status</span>
          <select
            className="user-field__input"
            value={form.approvalStatus}
            onChange={(e) => setForm((p) => ({ ...p, approvalStatus: e.target.value }))}
          >
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
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
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/team")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update member" : "Create member"}
        </button>
      </div>
    </form>
  );
}

export function TeamAdd() {
  const { canEdit } = useResourcePermissions("team");
  if (!canEdit) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add team member"
        subtitle="Create a panel account and assign any role. Optional Reports to links assistants to a coach."
        backTo="/admin/team"
      />
      <div className="page-card">
        <TeamForm mode="create" />
      </div>
    </div>
  );
}
