import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetFaqById } from "../../api/faqController.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate } from "./FaqShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function FaqView() {
  const { faqId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [faq, setFaq] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !faqId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetFaqById(adminToken, faqId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setFaq(row);
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
        setError(e.message || "Failed to load FAQ.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, faqId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/faq")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!faq) {
    return <AdminPageLoadingState label="Loading FAQ…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="FAQ details"
        subtitle="View this question and answer."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit FAQ
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="admin-detail-block">
          <span className="admin-detail-block__label">Question</span>
          <h3 className="admin-detail-block__title">{faq.question || "—"}</h3>
        </div>

        <div className="admin-detail-block">
          <span className="admin-detail-block__label">Answer</span>
          <div className="admin-detail-block__body">{faq.answer || "—"}</div>
        </div>

        <div className="admin-detail-block">
          <div className="user-view-grid">
            <div className="user-detail-row">
              <span className="user-detail-row__label">Status</span>
              <span className="user-detail-row__value">
                <AdminStatusBadge status={faq.status} />
              </span>
            </div>
            <DetailRow label="Created" value={formatDate(faq.createdAt)} />
            <DetailRow label="Updated" value={formatDate(faq.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}
