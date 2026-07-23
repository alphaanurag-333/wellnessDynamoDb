import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import { adminListWellnessCoaches } from "../../api/adminWellnessCoaches.js";
import {
  adminAssignHealUserCoach,
  adminReassignHealUserCoach,
  adminConvertUserToHeal,
  adminConvertUserToSeek,
} from "../../api/adminUserAssignment.js";
import { logout } from "../../../store/authSlice.js";
import { resolveUserId } from "../../api/adminUsers.js";

export function UserAssignCoachModal({ user, open, onClose, onSuccess, mode = "assign" }) {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coaches, setCoaches] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open || !adminToken) return;
    let cancelled = false;
    (async () => {
      setLoadingOptions(true);
      try {
        const { wellnessCoaches } = await adminListWellnessCoaches(adminToken, {
          status: "active",
          limit: 200,
        });
        if (!cancelled) setCoaches(wellnessCoaches || []);
      } catch (e) {
        if (e?.status === 401) dispatch(logout());
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, open]);

  useEffect(() => {
    if (!open) return;
    const parentId = user?.parentCoachId || user?.assignedCoachId || "";
    setSelectedCoachId(parentId);
  }, [open, user]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const coachId = String(selectedCoachId || "").trim();
    if (!coachId) {
      await Swal.fire({ icon: "warning", title: "Select a wellness coach" });
      return;
    }

    const payload = {
      assignedCoachId: coachId,
      assignedCoachType: "wellness_coach",
      parentCoachId: coachId,
    };

    setLoading(true);
    try {
      const uid = resolveUserId(user);
      const updated =
        mode === "assign"
          ? await adminAssignHealUserCoach(adminToken, uid, payload)
          : await adminReassignHealUserCoach(adminToken, uid, payload);
      await Swal.fire({
        icon: "success",
        title: mode === "assign" ? "Coach assigned" : "User reassigned",
        timer: 1500,
      });
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Failed", text: err.message || "Could not update assignment." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3 className="modal-card__title">{mode === "assign" ? "Assign wellness coach" : "Reassign user"}</h3>
        <p className="modal-card__subtitle">
          {user.name || user.email} — assignment history (referral) stays unchanged.
        </p>
        <form onSubmit={handleSubmit} className="modal-card__form">
          <label className="user-field">
            <span className="user-field__label">Wellness Coach</span>
            <select
              className="user-field__input"
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Select coach</option>
              {coaches.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Saving…" : mode === "assign" ? "Assign coach" : "Save reassignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConvertToSeekModal({ user, open, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [loading, setLoading] = useState(false);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    setLoading(true);
    try {
      const updated = await adminConvertUserToSeek(adminToken, resolveUserId(user));
      await Swal.fire({ icon: "success", title: "Downgraded to Seek", timer: 1500 });
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Downgrade failed", text: err.message || "Could not downgrade user." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3 className="modal-card__title">Downgrade to Seek (free)</h3>
        <p className="modal-card__subtitle">
          Downgrade {user.name || user.email} from Heal to Seek. Coach assignment and referral code will be removed.
        </p>
        <form onSubmit={handleSubmit} className="modal-card__form">
          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--danger" disabled={loading}>
              {loading ? "Downgrading…" : "Downgrade to Seek"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConvertToHealModal({ user, open, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setReferralCode("");
  }, [open]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    setLoading(true);
    try {
      const updated = await adminConvertUserToHeal(adminToken, resolveUserId(user), {
        referralCode: referralCode.trim() || undefined,
      });
      await Swal.fire({ icon: "success", title: "Converted to Heal", timer: 1500 });
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Conversion failed", text: err.message || "Could not convert user." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3 className="modal-card__title">Convert to Heal (paid)</h3>
        <p className="modal-card__subtitle">
          Upgrade {user.name || user.email} from Seek to Heal. This assigns the default Wellness Program,
          enables Energy Exchange, and prepares paid onboarding in the app. Use a referral code so coach
          assignment, program, and Energy Exchange are set up immediately; otherwise assign a coach after
          conversion.
        </p>
        <form onSubmit={handleSubmit} className="modal-card__form">
          <label className="user-field">
            <span className="user-field__label">Referral code (optional)</span>
            <input
              className="user-field__input"
              value={referralCode}
              onChange={(e) =>
                setReferralCode(
                  String(e.target.value || "")
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                )
              }
              placeholder="Leave empty for pending admin assignment"
              autoComplete="off"
            />
          </label>
          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--accent" disabled={loading}>
              {loading ? "Converting…" : "Convert to Heal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
