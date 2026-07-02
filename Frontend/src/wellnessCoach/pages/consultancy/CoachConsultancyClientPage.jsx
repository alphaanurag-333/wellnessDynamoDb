import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  coachGetConsultancyClient,
  coachUpdateConsultancyClient,
} from "../../api/coachConsultancy.js";
import {
  coachGetProgramForClient,
  coachAssignProgram,
  coachUpdateProgramAssignment,
  coachEnableProgramAssignment,
  coachDisableProgramAssignment,
} from "../../api/coachProgram.js";
import {
  coachListEnergyExchangePrograms,
  coachCreateEnergyExchangeProgram,
  coachUpdateEnergyExchangeProgram,
  coachEnableEnergyExchangeProgram,
  coachDisableEnergyExchangeProgram,
  coachPreviewEnergyExchangeProgram,
  coachGetEnergyExchangeForUser,
} from "../../api/coachEnergyExchange.js";
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
    <div className="page-card consultancy-client-page">
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

      <ProgramSection userId={user.id || user._id || userId} userPurchased={Boolean(user.programPurchased)} />
      <EnergyExchangeSection userId={user.id || user._id || userId} />
    </div>
  );
}

function programTypeCoachLabel(value) {
  const v = String(value || "").toLowerCase();
  if (v === "lifetime") return "Lifetime Membership";
  if (v === "goal_based") return "Goal Based";
  return value || "—";
}

function ProgramSection({ userId, userPurchased }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [clientUser, setClientUser] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coachGetProgramForClient(userId);
      setCatalog(data?.catalogPrograms || []);
      setClientUser(data?.user || null);
      const programs = data?.programs || [];
      const active =
        programs.find((p) => p.status === "assigned") ||
        programs.find((p) => p.status === "purchased") ||
        programs[0] ||
        null;
      setAssignment(active);
      setSelectedCatalogId(active?.catalogProgramId || "");
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [dispatch, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const purchased = userPurchased || clientUser?.programPurchased || assignment?.status === "purchased";
  const selectedCatalog = catalog.find((c) => (c.id || c._id) === selectedCatalogId);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedCatalogId) {
      setError("Select a program from the catalog.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (assignment?.id && assignment.status === "assigned") {
        await coachUpdateProgramAssignment(assignment.id, { catalogProgramId: selectedCatalogId });
      } else if (!purchased) {
        await coachAssignProgram({ userId, catalogProgramId: selectedCatalogId });
      }
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
      setError(err?.message || "Could not assign program.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!assignment?.id || purchased) return;
    setSaving(true);
    setError("");
    try {
      if (assignment.enabled) {
        await coachDisableProgramAssignment(assignment.id);
      } else {
        await coachEnableProgramAssignment(assignment.id);
      }
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
      setError(err?.message || "Could not update enablement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="form-card" style={{ marginTop: "1.5rem" }}>
        <h3 className="form-card__title">Wellness Program (one-time)</h3>
        <p className="table-placeholder">Loading program assignment…</p>
      </section>
    );
  }

  return (
    <section className="form-card" style={{ marginTop: "1.5rem" }}>
      <h3 className="form-card__title">Wellness Program (one-time)</h3>
      <p className="page-card__desc" style={{ marginBottom: "1rem" }}>
        Assign a catalog program for the client to purchase before Energy Exchange unlocks.
      </p>

      {purchased ? (
        <div className="user-detail-grid">
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value tier-badge tier-badge--heal">Purchased</span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Program</span>
            <span className="user-detail-row__value">{assignment?.title || "—"}</span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Type</span>
            <span className="user-detail-row__value">{programTypeCoachLabel(assignment?.programType)}</span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Amount</span>
            <span className="user-detail-row__value">₹{assignment?.price ?? "—"}</span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Purchased at</span>
            <span className="user-detail-row__value">
              {formatJoined(assignment?.purchasedAt || clientUser?.programPurchasedAt)}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAssign}>
          <label className="form-field">
            <span>Select program from catalog</span>
            <select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              disabled={catalog.length === 0}
            >
              <option value="">— Choose program —</option>
              {catalog.map((row) => (
                <option key={row.id || row._id} value={row.id || row._id}>
                  {row.title} · ₹{row.price} · {programTypeCoachLabel(row.programType)}
                </option>
              ))}
            </select>
          </label>

          {selectedCatalog ? (
            <div className="user-detail-grid" style={{ marginBottom: "1rem" }}>
              <div className="user-detail-row">
                <span className="user-detail-row__label">Price</span>
                <span className="user-detail-row__value">₹{selectedCatalog.price}</span>
              </div>
              <div className="user-detail-row">
                <span className="user-detail-row__label">Type</span>
                <span className="user-detail-row__value">{programTypeCoachLabel(selectedCatalog.programType)}</span>
              </div>
              {selectedCatalog.description ? (
                <div className="user-detail-row">
                  <span className="user-detail-row__label">Description</span>
                  <span className="user-detail-row__value">{selectedCatalog.description}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {assignment ? (
            <p className="form-hint">
              Current assignment: <strong>{assignment.title}</strong> ·{" "}
              {assignment.enabled ? "Enabled for user" : "Not enabled yet"}
            </p>
          ) : null}

          {error ? <p className="form-hint" style={{ color: "var(--admin-danger, #b91c1c)" }}>{error}</p> : null}

          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn--accent" disabled={saving || !selectedCatalogId}>
              {saving ? "Saving…" : assignment ? "Update assignment" : "Assign program"}
            </button>
            {assignment?.id ? (
              <button type="button" className="btn btn--ghost" onClick={handleToggleEnabled} disabled={saving}>
                {assignment.enabled ? "Disable for user" : "Enable for user"}
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}

const DEFAULT_FY_DISCOUNTS = { 1: 0, 2: 0, 3: 5, 4: 10 };
const DEFAULT_DISCOUNT_LIMITS = {
  fyDiscountRanges: Object.fromEntries([1, 2, 3, 4].map((offset) => [offset, { min: 0, max: 100 }])),
  timeBasedDiscountRange: { min: 0, max: 100 },
};

function clampDiscount(value, range) {
  const num = Number(value) || 0;
  return Math.max(range.min, Math.min(range.max, num));
}

function formatTimeBasedDiscountWindow(window) {
  if (!window) return "—";
  const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };
  const start = fmt(window.startsAt);
  const end = fmt(window.endsAt);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "No end date";
}

function EnergyExchangeSection({ userId }) {
  const dispatch = useDispatch();
  const [programs, setPrograms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [discountLimits, setDiscountLimits] = useState(DEFAULT_DISCOUNT_LIMITS);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [form, setForm] = useState({
    title: "Personalized Program designed by IRW",
    programType: "Goal based / Lifetime Membership",
    description: "",
    monthlyAmount: "",
    currency: "INR",
    enabled: false,
    fyDiscounts: { ...DEFAULT_FY_DISCOUNTS },
    timeBasedDiscount: { percentage: "", startsAt: "", endsAt: "", note: "" },
  });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coachGetEnergyExchangeForUser(userId);
      const list = data?.programs || [];
      setPrograms(list);
      setSubscriptions(data?.subscriptions || []);
      if (data?.discountLimits) {
        setDiscountLimits({
          fyDiscountRanges: {
            ...DEFAULT_DISCOUNT_LIMITS.fyDiscountRanges,
            ...(data.discountLimits.fyDiscountRanges || {}),
          },
          timeBasedDiscountRange: {
            ...DEFAULT_DISCOUNT_LIMITS.timeBasedDiscountRange,
            ...(data.discountLimits.timeBasedDiscountRange || {}),
          },
        });
      }
      if (list.length > 0) {
        const p = list[0];
        setActiveProgramId(p.id);
        setForm({
          title: p.title || "",
          programType: p.programType || "",
          description: p.description || "",
          monthlyAmount: p.monthlyAmount ?? "",
          currency: p.currency || "INR",
          enabled: Boolean(p.enabled),
          fyDiscounts: { ...DEFAULT_FY_DISCOUNTS, ...(p.fyDiscounts || {}) },
          timeBasedDiscount: {
            percentage: p.timeBasedDiscount?.percentage ?? "",
            startsAt: p.timeBasedDiscount?.startsAt ? p.timeBasedDiscount.startsAt.slice(0, 16) : "",
            endsAt: p.timeBasedDiscount?.endsAt ? p.timeBasedDiscount.endsAt.slice(0, 16) : "",
            note: p.timeBasedDiscount?.note || "",
          },
        });
      } else {
        setActiveProgramId(null);
      }
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [dispatch, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleFyDiscountChange = (key, value) => {
    const range = discountLimits.fyDiscountRanges[key] || { min: 0, max: 100 };
    setForm((f) => ({
      ...f,
      fyDiscounts: {
        ...f.fyDiscounts,
        [key]: clampDiscount(value, range),
      },
    }));
  };

  const handleTimeBasedPercentChange = (value) => {
    const range = discountLimits.timeBasedDiscountRange || { min: 0, max: 100 };
    const trimmed = String(value).trim();
    setForm((f) => ({
      ...f,
      timeBasedDiscount: {
        ...f.timeBasedDiscount,
        percentage: trimmed === "" ? "" : clampDiscount(trimmed, range),
      },
    }));
  };

  const buildPayload = () => ({
    userId,
    title: form.title,
    programType: form.programType,
    description: form.description,
    monthlyAmount: form.monthlyAmount === "" ? 0 : Number(form.monthlyAmount),
    currency: form.currency,
    enabled: Boolean(form.enabled),
    fyDiscounts: form.fyDiscounts,
    timeBasedDiscount:
      form.timeBasedDiscount.percentage
        ? {
            percentage: Number(form.timeBasedDiscount.percentage),
            startsAt: form.timeBasedDiscount.startsAt
              ? new Date(form.timeBasedDiscount.startsAt).toISOString()
              : null,
            endsAt: form.timeBasedDiscount.endsAt
              ? new Date(form.timeBasedDiscount.endsAt).toISOString()
              : null,
            note: form.timeBasedDiscount.note,
          }
        : null,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      let program;
      if (activeProgramId) {
        program = await coachUpdateEnergyExchangeProgram(activeProgramId, buildPayload());
      } else {
        program = await coachCreateEnergyExchangeProgram(buildPayload());
        setActiveProgramId(program.id);
      }
      setPrograms((list) => {
        const others = list.filter((p) => p.id !== program.id);
        return [program, ...others];
      });
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
      else setFormError(err?.message || "Failed to save Energy Exchange program.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!activeProgramId) return;
    const next = !form.enabled;
    try {
      const fn = next ? coachEnableEnergyExchangeProgram : coachDisableEnergyExchangeProgram;
      const program = await fn(activeProgramId);
      setForm((f) => ({ ...f, enabled: Boolean(program.enabled) }));
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
    }
  };

  const handlePreview = async () => {
    if (!activeProgramId) return;
    try {
      const data = await coachPreviewEnergyExchangeProgram(activeProgramId);
      setPreview(data);
    } catch (err) {
      if (err?.status === 401) dispatch(logoutCoach());
    }
  };

  if (loading) return <div className="form-card" style={{ marginTop: "1.5rem" }}>Loading Energy Exchange…</div>;

  return (
    <section className="form-card" style={{ marginTop: "1.5rem" }}>
      <h3 className="form-card__title">Energy Exchange Program</h3>
      <p className="page-card__desc" style={{ marginBottom: "1rem" }}>
        Configure the FY-based plan cards the user will see in their app.
      </p>

      <form onSubmit={handleSave}>
        <label className="form-field">
          <span>Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Personalized Program designed by IRW"
          />
        </label>
        <label className="form-field">
          <span>Program type</span>
          <input
            value={form.programType}
            onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))}
            placeholder="Goal based / Lifetime Membership"
          />
        </label>
        <label className="form-field">
          <span>Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label className="form-field">
          <span>Monthly amount ({form.currency})</span>
          <input
            type="number"
            min="0"
            value={form.monthlyAmount}
            onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
          />
        </label>

        <div className="form-field">
          <span>FY-tier discounts (%)</span>
          <p className="form-hint" style={{ marginBottom: ".5rem" }}>
            Allowed ranges are set by admin for each FY tier.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".5rem" }}>
            {[1, 2, 3, 4].map((offset) => {
              const range = discountLimits.fyDiscountRanges[offset] || { min: 0, max: 100 };
              return (
              <label key={offset} style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                <small>
                  FY {offset === 1 ? "current" : `+${offset - 1}`} ({range.min}–{range.max}%)
                </small>
                <input
                  type="number"
                  min={range.min}
                  max={range.max}
                  value={form.fyDiscounts[offset] ?? 0}
                  onChange={(e) => handleFyDiscountChange(offset, e.target.value)}
                />
              </label>
            );
            })}
          </div>
        </div>

        <fieldset className="form-field">
          <legend>Time-based discount (optional)</legend>
          <p className="page-card__desc" style={{ marginBottom: ".75rem" }}>
            Applies only to the <strong>Current FY</strong> plan card while the offer is active.
            Future FY cards use FY-tier discounts only.
          </p>
          <label className="form-field">
            <span>
              Percentage (
              {discountLimits.timeBasedDiscountRange.min}–{discountLimits.timeBasedDiscountRange.max}%)
            </span>
            <input
              type="number"
              min={discountLimits.timeBasedDiscountRange.min}
              max={discountLimits.timeBasedDiscountRange.max}
              value={form.timeBasedDiscount.percentage}
              onChange={(e) => handleTimeBasedPercentChange(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Starts at</span>
            <input
              type="datetime-local"
              value={form.timeBasedDiscount.startsAt}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  timeBasedDiscount: { ...f.timeBasedDiscount, startsAt: e.target.value },
                }))
              }
            />
          </label>
          <label className="form-field">
            <span>Ends at</span>
            <input
              type="datetime-local"
              value={form.timeBasedDiscount.endsAt}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  timeBasedDiscount: { ...f.timeBasedDiscount, endsAt: e.target.value },
                }))
              }
            />
          </label>
          <label className="form-field">
            <span>Note</span>
            <input
              value={form.timeBasedDiscount.note}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  timeBasedDiscount: { ...f.timeBasedDiscount, note: e.target.value },
                }))
              }
            />
          </label>
        </fieldset>

        {formError ? <p className="form-hint" style={{ color: "var(--admin-danger, #b91c1c)" }}>{formError}</p> : null}
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? "Saving…" : activeProgramId ? "Save program" : "Create program"}
          </button>
          {activeProgramId ? (
            <button type="button" className="btn btn--ghost" onClick={handleToggleEnabled}>
              {form.enabled ? "Disable for user" : "Enable for user"}
            </button>
          ) : null}
          {activeProgramId ? (
            <button type="button" className="btn btn--ghost" onClick={handlePreview}>
              Preview plans
            </button>
          ) : null}
        </div>
      </form>

      {preview?.plans?.length ? (
        <div style={{ marginTop: "1.5rem" }}>
          <h4 className="form-card__title">Preview (FY plan cards)</h4>
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>FY</th>
                <th>Months</th>
                <th>Base</th>
                <th>FY-tier %</th>
                <th>Time-based %</th>
                <th>Offer valid</th>
                <th>Total %</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {preview.plans.map((p) => (
                <tr key={p.fyStartYear}>
                  <td>
                    {p.label} (FY {p.fyStartYear})
                  </td>
                  <td>{p.monthsCovered}</td>
                  <td>₹{p.baseAmount}</td>
                  <td>{p.fyTierDiscountPercent || 0}%</td>
                  <td>{p.timeBasedDiscountPercent || 0}%</td>
                  <td>{formatTimeBasedDiscountWindow(p.timeBasedDiscountWindow)}</td>
                  <td>{p.effectiveDiscountPercent}%</td>
                  <td>₹{p.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "1.5rem" }}>
        <h4 className="form-card__title">Subscription history</h4>
        {subscriptions.length === 0 ? (
          <p className="table-placeholder">No subscriptions yet.</p>
        ) : (
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>FY</th>
                <th>Status</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>FY {s.fyStartYear}</td>
                  <td>{s.status}</td>
                  <td>{s.startsAt ? s.startsAt.slice(0, 10) : "—"}</td>
                  <td>{s.endsAt ? s.endsAt.slice(0, 10) : "—"}</td>
                  <td>₹{s.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </section>
  );
}
