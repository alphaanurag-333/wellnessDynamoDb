import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  adminChangePassword,
  adminGetMe,
  adminUpdateMe,
  adminUpdateMeWithFile,
} from "../api/adminAuth.js";
import { DEFAULT_IMAGE_SRC, handleMediaImageError } from "../components/AdminMediaImage.jsx";
import { ProfilePasswordField } from "../components/PortalProfileLayout.jsx";
import { mediaUrl } from "../../media.js";
import { setAdmin } from "../../store/authSlice.js";
import {
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  PERSON_NAME_MAX_LEN,
  sanitizePersonName,
  sanitizePhoneDigits,
  validatePersonName,
  validatePhoneDigits,
} from "../../utils/personFieldValidation.js";
import { validateImageFileSize } from "../../utils/mediaUploadValidation.js";
import {
  PROFILE_PASSWORD_MIN_LEN,
  PROFILE_PASSWORD_MAX_LEN,
  validateConfirmPassword,
  validateCurrentPassword,
  validateNewPassword,
  validateProfilePasswordFields,
} from "../../utils/profilePasswordValidation.js";

const PROFILE_TABS = [
  { id: "personal", label: "Personal Details" },
  { id: "password", label: "Change Password" },
];

export function AdminProfile() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const admin = useSelector((s) => s.auth.admin);

  const [tab, setTab] = useState("personal");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (!admin) return;
    setName(admin.name || "");
    setPhone(admin.phone || "");
  }, [admin]);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetMe(adminToken);
        if (!cancelled && data?.admin) dispatch(setAdmin(data.admin));
      } catch {
        /* handled in layout */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch]);

  const avatarSrc = useMemo(() => mediaUrl(admin?.profileImage), [admin]);
  const avatarCacheKey = admin?.updatedAt || admin?._id || "";
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !adminToken) return;

    const okTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!okTypes.includes(file.type)) {
      await Swal.fire({ icon: "error", title: "Invalid image", text: "Please choose a JPEG, PNG, GIF, or WebP image." });
      return;
    }
    const sizeErr = validateImageFileSize(file);
    if (sizeErr) {
      await Swal.fire({ icon: "error", title: "Image too large", text: sizeErr });
      return;
    }

    setPhotoLoading(true);
    try {
      const data = await adminUpdateMeWithFile(adminToken, {
        name: name.trim(),
        phone: phone.trim(),
        file,
      });
      if (data?.admin) dispatch(setAdmin(data.admin));
      await Swal.fire({ icon: "success", title: data?.message || "Profile photo updated", timer: 1300 });
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Upload failed", text: err.message || "Photo upload failed" });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleNameInput = (e) => {
    setName(sanitizePersonName(e.target.value));
  };

  const handlePhoneInput = (e) => {
    setPhone(sanitizePhoneDigits(e.target.value));
  };

  const clearPasswordError = (field) => {
    setPasswordErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleSave = async () => {
    if (tab === "personal") {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const nameErr = validatePersonName(trimmedName);
      if (nameErr) {
        await Swal.fire({ icon: "error", title: "Validation error", text: nameErr });
        return;
      }
      const phoneErr = validatePhoneDigits(trimmedPhone, { label: "Phone number" });
      if (phoneErr) {
        await Swal.fire({ icon: "error", title: "Validation error", text: phoneErr });
        return;
      }
      setLoading(true);
      try {
        const data = await adminUpdateMe(adminToken, { name: trimmedName, phone: trimmedPhone });
        if (data?.admin) dispatch(setAdmin(data.admin));
        await Swal.fire({ icon: "success", title: data?.message || "Profile updated", timer: 1300 });
      } catch (e) {
        await Swal.fire({ icon: "error", title: "Update failed", text: e.message || "Update failed" });
      } finally {
        setLoading(false);
      }
      return;
    }
    if (tab === "password") {
      const { errors, valid } = validateProfilePasswordFields({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordErrors(errors);
      if (!valid) return;

      setLoading(true);
      try {
        const data = await adminChangePassword(adminToken, {
          currentPassword,
          newPassword,
        });
        await Swal.fire({ icon: "success", title: data?.message || "Password updated", timer: 1300 });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (e) {
        await Swal.fire({ icon: "error", title: "Password change failed", text: e.message || "Password change failed" });
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  return (
    <div className="admin-profile-page">
      <div className="admin-profile-page__head">
        <h2 className="admin-profile-page__title">Admin Profile</h2>
        <button type="button" className="btn btn--save-profile" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="admin-profile-card">
        <div className="admin-profile-card__identity">
          <div className={`admin-profile-avatar-wrap${photoLoading ? " admin-profile-avatar-wrap--busy" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              className="admin-profile-avatar-file"
              accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleAvatarFile}
            />
            <img
              key={avatarCacheKey}
              src={
                avatarSrc
                  ? `${avatarSrc}${avatarSrc.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(avatarCacheKey))}`
                  : DEFAULT_IMAGE_SRC
              }
                alt=""
                className="admin-profile-avatar"
                width={88}
              height={88}
              onError={handleMediaImageError}
            />
            <button
              type="button"
              className="admin-profile-avatar-cam"
              aria-label="Change profile photo"
              title="Upload photo"
              disabled={photoLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            {photoLoading ? <span className="admin-profile-avatar-spinner" aria-live="polite" /> : null}
          </div>
          <div>
            <div className="admin-profile-card__name">{admin?.name || "—"}</div>
            <div className="admin-profile-card__email">{admin?.email || "—"}</div>
          </div>
        </div>

        <div className="admin-profile-tabs" role="tablist">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`admin-profile-tabs__btn${tab === t.id ? " admin-profile-tabs__btn--active" : ""}`}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "password") {
                  setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "personal" && (
          <div className="admin-profile-panel">
            <div className="user-form__grid" style={{ maxWidth: 640 }}>
              <label className="user-field">
                <span className="user-field__label">Full Name <span className="required-dot">*</span></span>
                <input
                  value={name}
                  onChange={handleNameInput}
                  onKeyDown={blockPersonNameDigitKeyDown}
                  maxLength={PERSON_NAME_MAX_LEN}
                  inputMode="text"
                  autoCapitalize="words"
                  required
                />
              </label>
              <label className="user-field">
                <span className="user-field__label">Email ID</span>
                <input value={admin?.email || ""} disabled className="input-disabled" />
              </label>
              <label className="user-field">
                <span className="user-field__label">Mobile Number <span className="required-dot">*</span></span>
                <input
                  value={phone}
                  onChange={handlePhoneInput}
                  onKeyDown={blockPhoneNonDigitKeyDown}
                  placeholder="9876543210"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  minLength={10}
                  required
                />
              </label>
            </div>
          </div>
        )}

        {tab === "password" && (
          <div className="admin-profile-panel">
            <div className="profile-password-form">
              <p className="profile-password-form__intro">
                Update your password regularly. Use {PROFILE_PASSWORD_MIN_LEN}–{PROFILE_PASSWORD_MAX_LEN} characters and avoid reusing passwords from other sites.
              </p>
              <ProfilePasswordField
                label="Current Password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  clearPasswordError("currentPassword");
                }}
                onBlur={(e) =>
                  setPasswordErrors((prev) => ({
                    ...prev,
                    currentPassword: validateCurrentPassword(e.target.value),
                  }))
                }
                visible={showPw.cur}
                onToggleVisible={() => setShowPw((s) => ({ ...s, cur: !s.cur }))}
                autoComplete="current-password"
                error={passwordErrors.currentPassword}
              />
              <ProfilePasswordField
                label="New Password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearPasswordError("newPassword");
                  if (passwordErrors.confirmPassword && e.target.value === confirmPassword) {
                    clearPasswordError("confirmPassword");
                  }
                }}
                onBlur={(e) =>
                  setPasswordErrors((prev) => ({
                    ...prev,
                    newPassword: validateNewPassword(e.target.value, currentPassword),
                    confirmPassword: confirmPassword
                      ? validateConfirmPassword(confirmPassword, e.target.value)
                      : prev.confirmPassword,
                  }))
                }
                visible={showPw.next}
                onToggleVisible={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                autoComplete="new-password"
                hint={`Must be ${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters.`}
                minLength={PROFILE_PASSWORD_MIN_LEN}
                maxLength={PROFILE_PASSWORD_MAX_LEN}
                error={passwordErrors.newPassword}
              />
              <ProfilePasswordField
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearPasswordError("confirmPassword");
                }}
                onBlur={(e) =>
                  setPasswordErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(e.target.value, newPassword),
                  }))
                }
                visible={showPw.conf}
                onToggleVisible={() => setShowPw((s) => ({ ...s, conf: !s.conf }))}
                autoComplete="new-password"
                maxLength={PROFILE_PASSWORD_MAX_LEN}
                error={passwordErrors.confirmPassword}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
