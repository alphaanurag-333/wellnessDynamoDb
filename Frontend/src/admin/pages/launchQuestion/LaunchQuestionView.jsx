import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetLaunchQuestionById } from "../../api/adminLaunchQuestions.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate } from "./LaunchQuestionShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function LaunchQuestionView() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [question, setQuestion] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !questionId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetLaunchQuestionById(adminToken, questionId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setQuestion(row);
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
        setError(e.message || "Failed to load question.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, questionId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/launch-questions")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!question) {
    return <AdminPageLoadingState label="Loading question…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="LAUNCH question"
        subtitle="View this LAUNCH assessment question."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit question
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Category" value={question.category} />
          <DetailRow label="Sort order" value={question.sortOrder ?? 0} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={question.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(question.createdAt)} />
          <DetailRow label="Updated" value={formatDate(question.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Question</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{question.question || "—"}</div>
        </div>
      </div>
    </div>
  );
}
