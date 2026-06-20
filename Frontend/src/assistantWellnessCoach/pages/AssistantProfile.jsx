import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  assistantChangePassword,
  assistantGetMe,
  assistantUpdateMe,
  assistantUpdateMeWithFile,
} from "../api/assistantAuth.js";
import {
  ProfileField,
  ProfilePageLayout,
  ProfilePasswordField,
} from "../../admin/components/PortalProfileLayout.jsx";
import { mediaUrl } from "../../media.js";
import { logoutAssistant, setAssistant } from "../../store/authSlice.js";
import { CopyReferralCode } from "../../components/ReferralAssignmentShared.jsx";
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

export function AssistantProfile() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const assistant = useSelector((s) => s.auth.assistant);

  const [tab, setTab] = useState("personal");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false });

  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (!assistant) return;
    setName(assistant.name || "");
    setPhone(assistant.phone || "");
    setDesignation(assistant.designation || "");
  }, [assistant]);

  useEffect(() => {
    if (!assistantToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await assistantGetMe(assistantToken);
        if (!cancelled && data?.assistant) dispatch(setAssistant(data.assistant));
      } catch (e) {
        if (e?.status === 401) dispatch(logoutAssistant());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assistantToken, dispatch]);

  const avatarSrc = useMemo(() => mediaUrl(assistant?.profileImage), [assistant]);
  const avatarCacheKey = assistant?.updatedAt || assistant?.id || assistant?._id || "";

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !assistantToken) return;

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
      const data = await assistantUpdateMeWithFile(assistantToken, {
        name: name.trim(),
        phone: phone.trim(),
        phoneCountryCode: assistant?.phoneCountryCode,
        designation: designation.trim(),
        file,
      });
      if (data?.assistant) dispatch(setAssistant(data.assistant));
      await Swal.fire({ icon: "success", title: data?.message || "Profile photo updated", timer: 1300 });
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logoutAssistant());
        return;
      }
      await Swal.fire({ icon: "error", title: "Upload failed", text: err.message || "Photo upload failed" });
    } finally {
      setPhotoLoading(false);
    }
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
        const data = await assistantUpdateMe(assistantToken, {
          name: trimmedName,
          phone: trimmedPhone,
          phoneCountryCode: assistant?.phoneCountryCode,
          designation: designation.trim() || null,
        });
        if (data?.assistant) dispatch(setAssistant(data.assistant));
        await Swal.fire({ icon: "success", title: data?.message || "Profile updated", timer: 1300 });
      } catch (e) {
        if (e?.status === 401) {
          dispatch(logoutAssistant());
          return;
        }
        await Swal.fire({ icon: "error", title: "Update failed", text: e.message || "Update failed" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Fill in current password, new password, and confirmation." });
      return;
    }
    if (newPassword !== confirmPassword) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 8) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "New password must be at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      const data = await assistantChangePassword(assistantToken, { currentPassword, newPassword });
      await Swal.fire({ icon: "success", title: data?.message || "Password updated", timer: 1300 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logoutAssistant());
        return;
      }
      await Swal.fire({ icon: "error", title: "Password change failed", text: e.message || "Password change failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfilePageLayout
      pageTitle="Assistant Wellness Coach Profile"
      userName={assistant?.name}
      userEmail={assistant?.email}
      avatarSrc={avatarSrc}
      avatarCacheKey={avatarCacheKey}
      photoLoading={photoLoading}
      fileInputRef={fileInputRef}
      onAvatarFile={handleAvatarFile}
      tab={tab}
      onTabChange={setTab}
      onSave={handleSave}
      saving={loading}
      personalFields={
        <>
          <ProfileField label="Full Name" required>
            <input
              className="user-field__input"
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
              onKeyDown={blockPersonNameDigitKeyDown}
              maxLength={PERSON_NAME_MAX_LEN}
              inputMode="text"
              autoCapitalize="words"
              required
            />
          </ProfileField>
          <ProfileField label="Email ID">
            <input className="user-field__input input-disabled" value={assistant?.email || ""} disabled />
          </ProfileField>
          <ProfileField label="Mobile Number" required>
            <input
              className="user-field__input"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
              onKeyDown={blockPhoneNonDigitKeyDown}
              placeholder="9876543210"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              minLength={10}
              required
            />
          </ProfileField>
          <ProfileField label="Designation">
            <input
              className="user-field__input"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              maxLength={120}
              placeholder="e.g. Senior Assistant Coach"
            />
          </ProfileField>
          <ProfileField label="Referral code" fullWidth>
            <CopyReferralCode code={assistant?.referralCode} label="" />
          </ProfileField>
          {assistant?.wellnessCoachName ? (
            <ProfileField label="Wellness Coach" fullWidth>
              <input className="user-field__input input-disabled" value={assistant.wellnessCoachName} disabled />
            </ProfileField>
          ) : null}
        </>
      }
      passwordFields={
        <>
          <ProfilePasswordField
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            visible={showPw.cur}
            onToggleVisible={() => setShowPw((s) => ({ ...s, cur: !s.cur }))}
            autoComplete="current-password"
          />
          <ProfilePasswordField
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            visible={showPw.next}
            onToggleVisible={() => setShowPw((s) => ({ ...s, next: !s.next }))}
            autoComplete="new-password"
            hint="Must be at least 8 characters."
          />
          <ProfilePasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            visible={showPw.conf}
            onToggleVisible={() => setShowPw((s) => ({ ...s, conf: !s.conf }))}
            autoComplete="new-password"
          />
        </>
      }
    />
  );
}
