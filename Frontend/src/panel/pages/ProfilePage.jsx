import { useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { staffChangePassword, staffUpdateMeWithFile } from "../api/staffAuth.js";
import {
  ProfileField,
  ProfilePageLayout,
  ProfilePasswordField,
} from "../../admin/components/PortalProfileLayout.jsx";
import { mediaUrl } from "../../media.js";
import { setStaffAccount } from "../../store/authSlice.js";
import { selectStaffAccount, selectStaffToken } from "../../store/staffAuthSelectors.js";
import {
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  PERSON_NAME_MAX_LEN,
  sanitizePersonName,
  sanitizePhoneDigits,
  validatePersonName,
} from "../../utils/personFieldValidation.js";
import { validateImageFileSize } from "../../utils/mediaUploadValidation.js";
import {
  PROFILE_PASSWORD_MAX_LEN,
  PROFILE_PASSWORD_MIN_LEN,
  validateConfirmPassword,
  validateCurrentPassword,
  validateNewPassword,
  validateProfilePasswordFields,
} from "../../utils/profilePasswordValidation.js";

const ACCOUNT_TYPE_LABELS = {
  admin: "Admin",
  wellness_coach: "Wellness Coach",
  assistant_wellness_coach: "Assistant Wellness Coach",
};

export function ProfilePage() {
  const dispatch = useDispatch();
  const token = useSelector(selectStaffToken);
  const staffAccount = useSelector(selectStaffAccount);
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("personal");
  const [name, setName] = useState(staffAccount?.name || "");
  const [phone, setPhone] = useState(staffAccount?.phone || "");
  const [bio, setBio] = useState(staffAccount?.bio || "");
  const [designation, setDesignation] = useState(staffAccount?.designation || "");
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false });
  const [passwordErrors, setPasswordErrors] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const clearPasswordError = (field) => setPasswordErrors((prev) => ({ ...prev, [field]: "" }));

  const accountTypeLabel = ACCOUNT_TYPE_LABELS[staffAccount?.accountType] || "Staff";
  const avatarSrc = useMemo(() => mediaUrl(staffAccount?.profileImage), [staffAccount]);
  const avatarCacheKey = staffAccount?.updatedAt || staffAccount?.id || "";

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
      const data = await staffUpdateMeWithFile(token, {
        name: name.trim(),
        phone: phone.trim(),
        bio: staffAccount?.accountType === "wellness_coach" ? bio.trim() : undefined,
        designation: staffAccount?.accountType === "assistant_wellness_coach" ? designation.trim() : undefined,
        file,
      });
      if (data?.account) dispatch(setStaffAccount({ ...data.account, permissions: staffAccount?.permissions }));
      await Swal.fire({ icon: "success", title: data?.message || "Profile photo updated", timer: 1300 });
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Upload failed", text: err.message || "Photo upload failed" });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSave = async () => {
    if (tab === "personal") {
      const trimmedName = name.trim();
      const nameErr = validatePersonName(trimmedName);
      if (nameErr) {
        await Swal.fire({ icon: "error", title: "Validation error", text: nameErr });
        return;
      }

      setSaving(true);
      try {
        const data = await staffUpdateMeWithFile(token, {
          name: trimmedName,
          phone: phone.trim(),
          bio: staffAccount?.accountType === "wellness_coach" ? bio.trim() || null : undefined,
          designation:
            staffAccount?.accountType === "assistant_wellness_coach" ? designation.trim() || null : undefined,
        });
        if (data?.account) dispatch(setStaffAccount({ ...data.account, permissions: staffAccount?.permissions }));
        await Swal.fire({ icon: "success", title: data?.message || "Profile updated", timer: 1300 });
      } catch (err) {
        await Swal.fire({ icon: "error", title: "Update failed", text: err.message || "Update failed" });
      } finally {
        setSaving(false);
      }
      return;
    }

    const { errors, valid } = validateProfilePasswordFields({ currentPassword, newPassword, confirmPassword });
    setPasswordErrors(errors);
    if (!valid) return;

    setSaving(true);
    try {
      const data = await staffChangePassword(token, { currentPassword, newPassword });
      await Swal.fire({ icon: "success", title: data?.message || "Password updated", timer: 1300 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Password change failed", text: err.message || "Password change failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfilePageLayout
      pageTitle={`${staffAccount?.isSuperAdmin ? "Super Admin" : accountTypeLabel} Profile`}
      userName={staffAccount?.name}
      userEmail={staffAccount?.email}
      avatarSrc={avatarSrc}
      avatarCacheKey={avatarCacheKey}
      photoLoading={photoLoading}
      fileInputRef={fileInputRef}
      onAvatarFile={handleAvatarFile}
      tab={tab}
      onTabChange={setTab}
      onSave={handleSave}
      saving={saving}
      personalFields={
        <>
          <ProfileField label="Full Name" required>
            <input
              className="user-field__input"
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
              onKeyDown={blockPersonNameDigitKeyDown}
              maxLength={PERSON_NAME_MAX_LEN}
              autoCapitalize="words"
              required
            />
          </ProfileField>
          <ProfileField label="Email ID">
            <input className="user-field__input input-disabled" value={staffAccount?.email || ""} disabled />
          </ProfileField>
          <ProfileField label="Mobile Number">
            <input
              className="user-field__input"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
              onKeyDown={blockPhoneNonDigitKeyDown}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </ProfileField>
          {staffAccount?.accountType === "wellness_coach" ? (
            <ProfileField label="Bio" fullWidth>
              <textarea
                className="user-field__input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell clients about your experience and approach."
              />
            </ProfileField>
          ) : null}
          {staffAccount?.accountType === "assistant_wellness_coach" ? (
            <ProfileField label="Designation">
              <input className="user-field__input" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </ProfileField>
          ) : null}
        </>
      }
      passwordFields={
        <>
          <p className="profile-password-form__intro">
            Update your password regularly. Use {PROFILE_PASSWORD_MIN_LEN}–{PROFILE_PASSWORD_MAX_LEN} characters and
            avoid reusing passwords from other sites.
          </p>

          <ProfilePasswordField
            label="Current Password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              clearPasswordError("currentPassword");
            }}
            onBlur={(e) =>
              setPasswordErrors((prev) => ({ ...prev, currentPassword: validateCurrentPassword(e.target.value) }))
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
        </>
      }
    />
  );
}
