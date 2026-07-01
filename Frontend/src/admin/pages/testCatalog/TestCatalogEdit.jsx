import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetTestCatalogById } from "../../api/adminTestCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { TestCatalogForm } from "./TestCatalogAdd.jsx";

export function TestCatalogEdit() {
  const { testId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !testId) return;
    (async () => {
      setLoading(true);
      try {
        const row = await adminGetTestCatalogById(adminToken, testId);
        if (!row) throw new Error("Test not found");
        setTest(row);
      } catch (e) {
        if (e?.status === 401) return dispatch(logout());
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load test." });
        navigate("/admin/test-catalog");
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken, dispatch, navigate, testId]);

  if (loading) return <AdminPageLoader label="Loading test…" />;

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit test catalog entry" subtitle={test?.name} backTo="/admin/test-catalog" />
      <div className="page-card">
        {test ? <TestCatalogForm mode="edit" initialTest={test} key={test._id || testId} /> : null}
      </div>
    </div>
  );
}
