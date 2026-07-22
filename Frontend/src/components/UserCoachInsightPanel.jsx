import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { AdminPageLoader } from "../admin/components/AdminLoader.jsx";
import { formatDateTime } from "../admin/utils/formatDate.js";

const MAX_MESSAGE_LENGTH = 500;

function formatUpdatedAt(iso) {
  return formatDateTime(iso);
}

export function UserCoachInsightPanel({
  token,
  userId,
  fetchInsight,
  saveInsight,
  embedded = false,
}) {
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const row = await fetchInsight(token, userId);
      setMessage(row?.message || "");
      setUpdatedAt(row?.updatedAt || null);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Load failed",
        text: e.message || "Could not load coach message.",
      });
      setMessage("");
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, [token, userId, fetchInsight]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!token || !userId) return;
    const trimmed = message.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      await Swal.fire({
        icon: "error",
        title: "Message too long",
        text: `Please keep the message under ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    setSaving(true);
    try {
      const row = await saveInsight(token, userId, trimmed);
      setMessage(row?.message || "");
      setUpdatedAt(row?.updatedAt || null);
      await Swal.fire({
        icon: "success",
        title: trimmed ? "Message saved" : "Message cleared",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: e.message || "Could not save coach message.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return embedded ? (
      <AdminPageLoader label="Loading coach message…" />
    ) : (
      <div className="page-card">
        <AdminPageLoader label="Loading coach message…" />
      </div>
    );
  }

  const content = (
    <div className="form-card">
      <div className="form-card__head">
        <h3 className="form-card__title">Coach message</h3>
        <span className="page-card__desc">Heal (paid) users only</span>
      </div>
      <p className="page-card__desc">
        This message appears on the client&apos;s Heal home screen under &quot;Message from coach&quot;.
        {updatedAt ? ` Last updated ${formatUpdatedAt(updatedAt)}.` : ""}
      </p>
      <label className="user-field">
        <span className="user-field__label">Message</span>
        <textarea
          className="user-field__input"
          rows={5}
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a personalized note for this client…"
        />
      </label>
      <p className="page-card__desc">
        {message.trim().length}/{MAX_MESSAGE_LENGTH} characters. Clear the text and save to remove the message.
      </p>
      <div className="form-card__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save message"}
        </button>
      </div>
    </div>
  );

  if (embedded) return content;
  return <div className="page-card">{content}</div>;
}
