import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetFaqById } from "../../api/faqController.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
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
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">FAQ details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit FAQ
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Status" value={faq.status} />
          <DetailRow label="Created" value={formatDate(faq.createdAt)} />
          <DetailRow label="Updated" value={formatDate(faq.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Question</strong>
          <div style={{ marginTop: 6, overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {faq.question || "—"}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Answer</strong>
          <div style={{ marginTop: 6, overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {faq.answer || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
