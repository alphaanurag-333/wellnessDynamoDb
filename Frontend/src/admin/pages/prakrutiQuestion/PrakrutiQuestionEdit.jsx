import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetPrakrutiQuestionById } from "../../api/adminPrakrutiQuestions.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { PrakrutiQuestionForm } from "./PrakrutiQuestionAdd.jsx";

export function PrakrutiQuestionEdit() {
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
        const row = await adminGetPrakrutiQuestionById(adminToken, questionId);
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
        navigate("/admin/prakruti-questions");
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
        title="Edit Prakruti question"
        subtitle="Update this Prakruti assessment question."
        backTo="/admin/prakruti-questions"
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading question..." />
          </div>
        ) : question ? (
          <PrakrutiQuestionForm mode="edit" initialQuestion={question} key={question._id || questionId} />
        ) : null}
      </div>
    </div>
  );
}
