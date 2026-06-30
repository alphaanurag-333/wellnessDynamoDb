import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetMedicalConditionQuestionById } from "../../api/adminMedicalConditionQuestions.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { MedicalConditionQuestionForm } from "./MedicalConditionQuestionAdd.jsx";

export function MedicalConditionQuestionEdit() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [question, setQuestion] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !questionId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetMedicalConditionQuestionById(adminToken, questionId);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load question." });
        navigate("/admin/medical-condition-questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, questionId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit medical condition question"
        subtitle="Update this onboarding question."
        backTo="/admin/medical-condition-questions"
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading question..." />
          </div>
        ) : question ? (
          <MedicalConditionQuestionForm mode="edit" initialQuestion={question} key={question._id || questionId} />
        ) : null}
      </div>
    </div>
  );
}
