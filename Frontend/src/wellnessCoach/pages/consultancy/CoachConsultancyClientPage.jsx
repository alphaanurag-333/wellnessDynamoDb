import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  coachGetConsultancyClient,
  coachUpdateConsultancyClient,
} from "../../api/coachConsultancy.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { UserTierBadge } from "../../../components/ReferralAssignmentShared.jsx";
import {
  formatDate,
  formatJoined,
  formatMoney,
  PaymentStatusPill,
} from "../../../components/consultancy/ConsultancyPortalShared.jsx";

export function CoachConsultancyClientPage() {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    zoomMeetingLink: "",
    sessionScheduledAt: "",
    consultancyStatus: "",
    consultancyNotes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coachGetConsultancyClient(userId);
      setClient(data);
      const txn = data.latestConsultancyTransaction;
      setForm({
        zoomMeetingLink: txn?.zoomMeetingLink || "",
        sessionScheduledAt: txn?.sessionScheduledAt ? txn.sessionScheduledAt.slice(0, 16) : "",
        consultancyStatus: txn?.consultancyStatus || "",
        consultancyNotes: txn?.consultancyNotes || "",
      });
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [dispatch, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    const txnId = client?.latestConsultancyTransaction?.id;
    if (!txnId) return;
    setSaving(true);
    try {
      await coachUpdateConsultancyClient(txnId, {
        zoomMeetingLink: form.zoomMeetingLink,
        sessionScheduledAt: form.sessionScheduledAt ? new Date(form.sessionScheduledAt).toISOString() : null,
        consultancyStatus: form.consultancyStatus || null,
        consultancyNotes: form.consultancyNotes,
      });
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-card">Loading client…</div>;
  if (!client?.user) return <div className="page-card">Client not found.</div>;

  const { user, latestConsultancyTransaction: txn, subscriptionActive } = client;

  return (
    <div className="page-card">
      <div className="page-card__head">
        <div>
          <Link to="/coach/consultancy/enrolled-users" className="btn btn--ghost btn--sm">
            ← Back
          </Link>
          <h2 className="page-card__title">{user.name || "Client"}</h2>
          <p className="page-card__desc">{user.email}</p>
        </div>
        <div className="page-card__actions">
          <UserTierBadge tier={user.userTier} assignmentStatus={user.assignmentStatus} />
          <span className={`tier-badge ${subscriptionActive ? "tier-badge--heal" : "tier-badge--consultancy"}`}>
            {subscriptionActive ? "Seek to Heal active" : "Consultancy only"}
          </span>
        </div>
      </div>

      <section className="user-detail-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="user-detail-row">
          <span className="user-detail-row__label">Phone</span>
          <span className="user-detail-row__value">
            {[user.phoneCountryCode, user.phone].filter(Boolean).join(" ") || "—"}
          </span>
        </div>
        <div className="user-detail-row">
          <span className="user-detail-row__label">Consultancy payment</span>
          <span className="user-detail-row__value">
            {txn ? (
              <>
                <PaymentStatusPill status={txn.paymentStatus} /> · {formatMoney(txn.totalAmount)} ·{" "}
                {txn.referenceNumber}
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="user-detail-row">
          <span className="user-detail-row__label">Paid at</span>
          <span className="user-detail-row__value">{formatJoined(txn?.paidAt)}</span>
        </div>
      </section>

      {txn ? (
        <form className="form-card" onSubmit={handleSave}>
          <h3 className="form-card__title">Session & consultancy notes</h3>
          <label className="form-field">
            <span>Zoom / meeting link</span>
            <input
              type="url"
              value={form.zoomMeetingLink}
              onChange={(e) => setForm((f) => ({ ...f, zoomMeetingLink: e.target.value }))}
              placeholder="https://zoom.us/j/..."
            />
          </label>
          <label className="form-field">
            <span>Session date & time</span>
            <input
              type="datetime-local"
              value={form.sessionScheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, sessionScheduledAt: e.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>Consultancy status</span>
            <select
              value={form.consultancyStatus}
              onChange={(e) => setForm((f) => ({ ...f, consultancyStatus: e.target.value }))}
            >
              <option value="">—</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="follow_up_needed">Follow-up needed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              rows={4}
              value={form.consultancyNotes}
              onChange={(e) => setForm((f) => ({ ...f, consultancyNotes: e.target.value }))}
            />
          </label>
          {txn.sessionScheduledAt ? (
            <p className="form-hint">Current schedule: {formatDate(txn.sessionScheduledAt)}</p>
          ) : null}
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : (
        <p className="table-placeholder">No paid consultancy transaction on file.</p>
      )}
    </div>
  );
}
