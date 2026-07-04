import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteContactInquiry,
  adminGetContactInquiryById,
  adminUpdateContactInquiry,
} from "../../api/contactInquiries.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import {
  InquiryStatusBadge,
  STATUS_OPTIONS,
  formatDateTime,
  fullName,
  inquiryTypeLabel,
} from "./ContactInquiryShared.jsx";

function DetailRow({ label, value, children }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{children ?? value ?? "—"}</span>
    </div>
  );
}

export function ContactInquiryView() {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [inquiry, setInquiry] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState("new");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!adminToken || !inquiryId) return;
    try {
      const data = await adminGetContactInquiryById(adminToken, inquiryId);
      if (!data) {
        setNotFound(true);
        return;
      }
      setInquiry(data);
      setStatus(data.status || "new");

      if (data.status === "new") {
        try {
          const updated = await adminUpdateContactInquiry(adminToken, inquiryId, { status: "read" });
          if (updated) {
            setInquiry(updated);
            setStatus(updated.status || "read");
          }
        } catch {
          // Non-blocking: view still works if auto-mark fails.
        }
      }
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      if (e?.status === 404) setNotFound(true);
    }
  };

  useEffect(() => {
    load();
  }, [adminToken, inquiryId]);

  const onSaveStatus = async () => {
    if (!adminToken || !inquiryId || !inquiry) return;
    setSaving(true);
    try {
      const updated = await adminUpdateContactInquiry(adminToken, inquiryId, { status });
      setInquiry(updated);
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Update failed", text: e.message || "Could not update status." });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete inquiry?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !inquiryId) return;
    try {
      await adminDeleteContactInquiry(adminToken, inquiryId);
      await Swal.fire({ icon: "success", title: "Inquiry deleted", timer: 1500 });
      navigate("/admin/contact-inquiries");
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete inquiry." });
    }
  };

  if (notFound) return <NotFoundPage />;
  if (!inquiry) return <AdminPageLoadingState label="Loading inquiry…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Contact inquiry"
        subtitle={`Submitted ${formatDateTime(inquiry.createdAt)}`}
        onBack={() => navigate("/admin/contact-inquiries")}
        actions={
          <button type="button" className="btn btn--danger" onClick={onDelete}>
            <AiFillDelete size={16} style={{ marginRight: 6 }} />
            Delete
          </button>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Name" value={fullName(inquiry)} />
          <DetailRow label="Email">
            <a href={`mailto:${inquiry.email || ""}`}>{inquiry.email || "—"}</a>
          </DetailRow>
          <DetailRow label="Phone">
            {inquiry.phone ? (
              <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Inquiry type" value={inquiryTypeLabel(inquiry.inquiryType)} />
          <DetailRow label="Status">
            <InquiryStatusBadge status={inquiry.status} />
          </DetailRow>
          <DetailRow label="Updated" value={formatDateTime(inquiry.updatedAt)} />
        </div>

        <div style={{ marginTop: 20 }}>
          <strong>Message</strong>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{inquiry.message || "—"}</div>
        </div>

        <div className="admin-crud-filters" style={{ marginTop: 24, alignItems: "flex-end" }}>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Update status</span>
            <select className="user-field__input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving || status === inquiry.status}
            onClick={onSaveStatus}
          >
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      </div>
    </div>
  );
}
