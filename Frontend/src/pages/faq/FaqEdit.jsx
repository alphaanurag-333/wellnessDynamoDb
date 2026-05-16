import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetFaqById } from "../../api/faqController.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { FaqForm } from "./FaqAdd.jsx";
import { getFaqId } from "./FaqShared.js";

export function FaqEdit() {
  const { faqId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [faq, setFaq] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !faqId) return;
    let cancelled = false;
    setLoading(true);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load FAQ." });
        navigate("/admin/faq");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, faqId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Edit FAQ</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/faq")}>
            Back to list
          </button>
        </div>
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading FAQ..." />
          </div>
        ) : faq ? (
          <FaqForm mode="edit" initialFaq={faq} key={getFaqId(faq) || faqId} />
        ) : null}
      </div>
    </div>
  );
}
