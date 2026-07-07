import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  coachChangePassword,
  coachGetMe,
  coachUpdateMe,
  coachUpdateMeWithFile,
} from "../api/coachAuth.js";
import {
  ProfileField,
  ProfilePageLayout,
  ProfilePasswordField,
} from "../../admin/components/PortalProfileLayout.jsx";
import { CoachPageLoadingState } from "../components/CoachPageLoader.jsx";
import { mediaUrl } from "../../media.js";
import { logoutCoach, setCoach } from "../../store/authSlice.js";
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
import {
  PROFILE_PASSWORD_MIN_LEN,
  PROFILE_PASSWORD_MAX_LEN,
  validateConfirmPassword,
  validateCurrentPassword,
  validateNewPassword,
  validateProfilePasswordFields,
} from "../../utils/profilePasswordValidation.js";

export function CoachProfile() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const coach = useSelector((s) => s.auth.coach);

  const [tab, setTab] = useState("personal");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const clearPasswordError = (field) => {
    setPasswordErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (!coach) return;
    setName(coach.name || "");
    setPhone(coach.phone || "");
    setBio(coach.bio || "");
  }, [coach]);

  useEffect(() => {
    if (!coachToken) return;
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      try {
        const data = await coachGetMe(coachToken);
        if (!cancelled && data?.coach) dispatch(setCoach(data.coach));
      } catch (e) {
        if (e?.status === 401) dispatch(logoutCoach());
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachToken, dispatch]);

  const avatarSrc = useMemo(() => mediaUrl(coach?.profileImage), [coach]);
  const avatarCacheKey = coach?.updatedAt || coach?.id || coach?._id || "";

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !coachToken) return;

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
      const data = await coachUpdateMeWithFile(coachToken, {
        name: name.trim(),
        phone: phone.trim(),
        phoneCountryCode: coach?.phoneCountryCode,
        bio: bio.trim(),
        file,
      });
      if (data?.coach) dispatch(setCoach(data.coach));
      await Swal.fire({ icon: "success", title: data?.message || "Profile photo updated", timer: 1300 });
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logoutCoach());
        return;
      }
      await Swal.fire({ icon: "error", title: "Upload failed", text: err.message || "Photo upload failed" });
    } finally {
      setPhotoLoading(false);
    }
  };

  // const handleSave = async () => {
  //   if (tab === "personal") {
  //     const trimmedName = name.trim();
  //     const trimmedPhone = phone.trim();
  //     const nameErr = validatePersonName(trimmedName);
  //     if (nameErr) {
  //       await Swal.fire({ icon: "error", title: "Validation error", text: nameErr });
  //       return;
  //     }
  //     const phoneErr = validatePhoneDigits(trimmedPhone, { label: "Phone number" });
  //     if (phoneErr) {
  //       await Swal.fire({ icon: "error", title: "Validation error", text: phoneErr });
  //       return;
  //     }
  //     setLoading(true);
  //     try {
  //       const data = await coachUpdateMe(coachToken, {
  //         name: trimmedName,
  //         phone: trimmedPhone,
  //         phoneCountryCode: coach?.phoneCountryCode,
  //         bio: bio.trim() || null,
  //       });
  //       if (data?.coach) dispatch(setCoach(data.coach));
  //       await Swal.fire({ icon: "success", title: data?.message || "Profile updated", timer: 1300 });
  //     } catch (e) {
  //       if (e?.status === 401) {
  //         dispatch(logoutCoach());
  //         return;
  //       }
  //       await Swal.fire({ icon: "error", title: "Update failed", text: e.message || "Update failed" });
  //     } finally {
  //       setLoading(false);
  //     }
  //     return;
  //   }

  //   if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
  //     await Swal.fire({ icon: "error", title: "Validation error", text: "Fill in current password, new password, and confirmation." });
  //     return;
  //   }
  //   if (newPassword !== confirmPassword) {
  //     await Swal.fire({ icon: "error", title: "Validation error", text: "New password and confirmation do not match." });
  //     return;
  //   }
  //   if (newPassword.length < 8) {
  //     await Swal.fire({ icon: "error", title: "Validation error", text: "New password must be at least 8 characters." });
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const data = await coachChangePassword(coachToken, { currentPassword, newPassword });
  //     await Swal.fire({ icon: "success", title: data?.message || "Password updated", timer: 1300 });
  //     setCurrentPassword("");
  //     setNewPassword("");
  //     setConfirmPassword("");
  //   } catch (e) {
  //     if (e?.status === 401) {
  //       dispatch(logoutCoach());
  //       return;
  //     }
  //     await Swal.fire({ icon: "error", title: "Password change failed", text: e.message || "Password change failed" });
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const handleSave = async () => {
    if (tab === "personal") {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
  
      const nameErr = validatePersonName(trimmedName);
      if (nameErr) {
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: nameErr,
        });
        return;
      }
  
      const phoneErr = validatePhoneDigits(trimmedPhone, {
        label: "Phone number",
      });
  
      if (phoneErr) {
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: phoneErr,
        });
        return;
      }
  
      setLoading(true);
  
      try {
        const data = await coachUpdateMe(coachToken, {
          name: trimmedName,
          phone: trimmedPhone,
          phoneCountryCode: coach?.phoneCountryCode,
          bio: bio.trim() || null,
        });
  
        if (data?.coach) {
          dispatch(setCoach(data.coach));
        }
  
        await Swal.fire({
          icon: "success",
          title: data?.message || "Profile updated",
          timer: 1300,
        });
      } catch (e) {
        if (e?.status === 401) {
          dispatch(logoutCoach());
          return;
        }
  
        await Swal.fire({
          icon: "error",
          title: "Update failed",
          text: e.message || "Update failed",
        });
      } finally {
        setLoading(false);
      }
  
      return;
    }
  
    // Password Validation
    const errors = validateProfilePasswordFields({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  
    setPasswordErrors(errors);
  
    if (
      errors.currentPassword ||
      errors.newPassword ||
      errors.confirmPassword
    ) {
      return;
    }
  
    setLoading(true);
  
    try {
      const data = await coachChangePassword(coachToken, {
        currentPassword,
        newPassword,
      });
  
      await Swal.fire({
        icon: "success",
        title: data?.message || "Password updated",
        timer: 1300,
      });
  
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
  
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logoutCoach());
        return;
      }
  
      await Swal.fire({
        icon: "error",
        title: "Password change failed",
        text: e.message || "Password change failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return <CoachPageLoadingState label="Loading profile…" wrapClassName="admin-profile-page" />;
  }

  return (
    <ProfilePageLayout
      pageTitle="Wellness Coach Profile"
      userName={coach?.name}
      userEmail={coach?.email}
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
            <input className="user-field__input input-disabled" value={coach?.email || ""} disabled />
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
          <ProfileField label="Bio" fullWidth>
            <textarea
              className="user-field__input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Tell clients about your experience and approach."
            />
          </ProfileField>
          <ProfileField label="Referral code" fullWidth>
            <CopyReferralCode code={coach?.referralCode} label="" />
          </ProfileField>
        </>
      }
      // passwordFields={
      //   <>
      //     <ProfilePasswordField
      //       label="Current Password"
      //       value={currentPassword}
      //       onChange={(e) => setCurrentPassword(e.target.value)}
      //       visible={showPw.cur}
      //       onToggleVisible={() => setShowPw((s) => ({ ...s, cur: !s.cur }))}
      //       autoComplete="current-password"
      //     />
      //     <ProfilePasswordField
      //       label="New Password"
      //       value={newPassword}
      //       onChange={(e) => setNewPassword(e.target.value)}
      //       visible={showPw.next}
      //       onToggleVisible={() => setShowPw((s) => ({ ...s, next: !s.next }))}
      //       autoComplete="new-password"
      //       hint="Must be at least 8 characters."
      //     />
      //     <ProfilePasswordField
      //       label="Confirm Password"
      //       value={confirmPassword}
      //       onChange={(e) => setConfirmPassword(e.target.value)}
      //       visible={showPw.conf}
      //       onToggleVisible={() => setShowPw((s) => ({ ...s, conf: !s.conf }))}
      //       autoComplete="new-password"
      //     />
      //   </>
      // }

      passwordFields={
        <>
          <p className="profile-password-form__intro">
            Update your password regularly. Use{" "}
            {PROFILE_PASSWORD_MIN_LEN}–{PROFILE_PASSWORD_MAX_LEN} characters
            and avoid reusing passwords from other sites.
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
            onToggleVisible={() =>
              setShowPw((s) => ({
                ...s,
                cur: !s.cur,
              }))
            }
            autoComplete="current-password"
            error={passwordErrors.currentPassword}
          />
      
          <ProfilePasswordField
            label="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              clearPasswordError("newPassword");
      
              if (
                passwordErrors.confirmPassword &&
                e.target.value === confirmPassword
              ) {
                clearPasswordError("confirmPassword");
              }
            }}
            onBlur={(e) =>
              setPasswordErrors((prev) => ({
                ...prev,
                newPassword: validateNewPassword(
                  e.target.value,
                  currentPassword
                ),
                confirmPassword: confirmPassword
                  ? validateConfirmPassword(
                      confirmPassword,
                      e.target.value
                    )
                  : prev.confirmPassword,
              }))
            }
            visible={showPw.next}
            onToggleVisible={() =>
              setShowPw((s) => ({
                ...s,
                next: !s.next,
              }))
            }
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
                confirmPassword: validateConfirmPassword(
                  e.target.value,
                  newPassword
                ),
              }))
            }
            visible={showPw.conf}
            onToggleVisible={() =>
              setShowPw((s) => ({
                ...s,
                conf: !s.conf,
              }))
            }
            autoComplete="new-password"
            maxLength={PROFILE_PASSWORD_MAX_LEN}
            error={passwordErrors.confirmPassword}
          />
        </>
      }
    />
  );
}
