import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetUser } from "../../api/adminUsers.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";
import {
  CopyReferralCode,
  UserTierBadge,
  formatAssignedCoachLabel,
  formatReferredByLabel,
} from "../../../components/ReferralAssignmentShared.jsx";
import { ConvertToHealModal, UserAssignCoachModal } from "./UserAssignmentModals.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function UserView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState("assign");

  useEffect(() => {
    if (!adminToken || !userId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setNotFound(false);
      setLoading(true);
      try {
        const u = await adminGetUser(adminToken, userId);
        if (cancelled) return;
        if (!u) {
          setNotFound(true);
          return;
        }
        setUser(u);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e.message || "Failed to load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, userId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
          Back to users
        </button>
      </div>
    );
  }

  if (loading) {
    return <UserPageLoadingState label="Loading user…" />;
  }

  if (!user) {
    return null;
  }

  let dobLabel = "—";
  if (user.dob) {
    const d = new Date(user.dob);
    if (!Number.isNaN(d.getTime())) dobLabel = d.toLocaleDateString(undefined, { dateStyle: "medium" });
  }

  const phc = user.primaryHealthConcern;
  const phcLabel =
    phc && typeof phc === "object" && phc.title != null
      ? `${phc.title} (${phc._id || ""})`
      : phc != null
        ? String(phc)
        : "—";

  const phoneDisplay = [user.phoneCountryCode, user.phone].filter(Boolean).join(" ") || "—";
  const waDisplay = user.whatsappSameAsMobile
    ? `Same as mobile (${phoneDisplay})`
    : [user.whatsappCountryCode, user.whatsappPhone].filter(Boolean).join(" ") || "—";

  const tier = String(user.userTier || "seek").toLowerCase();
  const isSeek = tier === "seek";
  const isConsultancyOnly = tier === "consultancy_only";
  const isPendingAssignment =
    (tier === "heal" || tier === "consultancy_only") && user.assignmentStatus === "pending_admin";

  const openAssignModal = (mode) => {
    setAssignMode(mode);
    setShowAssignModal(true);
  };

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">User details</h2>
          <UserTierBadge tier={user.userTier} assignmentStatus={user.assignmentStatus} />
        </div>
        <div className="user-page__toolbar-actions">
          {isSeek ? (
            <button type="button" className="btn btn--accent" onClick={() => setShowConvertModal(true)}>
              Convert to Heal
            </button>
          ) : null}
          {isConsultancyOnly ? (
            <span className="tier-badge tier-badge--consultancy">Consultancy paid</span>
          ) : null}
          {isPendingAssignment ? (
            <button type="button" className="btn btn--primary" onClick={() => openAssignModal("assign")}>
              Assign coach
            </button>
          ) : null}
          {tier === "heal" && !isPendingAssignment ? (
            <button type="button" className="btn btn--ghost" onClick={() => openAssignModal("reassign")}>
              Reassign coach
            </button>
          ) : null}
          <Link to="edit" className="btn btn--accent">
            Edit user
          </Link>
          <Link to="water-tracking" className="btn btn--ghost">
            Water tracking
          </Link>
          <Link to="steps-tracking" className="btn btn--ghost">
            Steps tracking
          </Link>
        </div>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-head">
          <div className="user-view-avatar-wrap">
            <AdminMediaImage path={user.profileImage} round width={96} height={96} alt={user.name || "Profile"} />
          </div>
          <div className="user-view-grid">
            <DetailRow label="Full name" value={user.name} />
            <DetailRow label="Email ID" value={user.email} />
            <DetailRow label="Phone" value={phoneDisplay} />
            <DetailRow label="WhatsApp" value={waDisplay} />
            <DetailRow label="Date of birth" value={dobLabel} />
            <DetailRow label="Gender" value={user.gender} />
            <DetailRow label="Country" value={user.country} />
            <DetailRow label="State" value={user.state} />
            <DetailRow label="City" value={user.city} />
            <DetailRow label="Primary health concern" value={phc?.title || "—"} />
            <DetailRow label="Terms accepted" value={user.termsAccepted ? "Yes" : "No"} />
            <DetailRow
              label="Terms accepted at"
              value={user.termsAcceptedAt ? formatDate(user.termsAcceptedAt) : "—"}
            />
            <DetailRow label="Status" value={user.status} />
            <DetailRow label="User tier" value={tier === "heal" ? "Heal (paid)" : "Seek (free)"} />
            {tier === "heal" ? (
              <>
                <DetailRow label="Assignment status" value={user.assignmentStatus || "—"} />
                <DetailRow label="Assigned to" value={formatAssignedCoachLabel(user)} />
                <DetailRow label="Owning coach" value={user.parentCoach?.name || user.parentCoachId || "—"} />
                <DetailRow label="Referred by" value={formatReferredByLabel(user)} />
                <DetailRow label="Converted at" value={formatDate(user.convertedAt)} />
                <CopyReferralCode code={user.referralCode} label="Referral code" />
              </>
            ) : null}
            <DetailRow label="Created At" value={formatDate(user.createdAt)} />
            <DetailRow label="Updated At" value={formatDate(user.updatedAt)} />
          </div>
        </div>
      </div>

      <ConvertToHealModal
        user={user}
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={setUser}
      />
      <UserAssignCoachModal
        user={user}
        open={showAssignModal}
        mode={assignMode}
        onClose={() => setShowAssignModal(false)}
        onSuccess={setUser}
      />
    </div>
  );
}
