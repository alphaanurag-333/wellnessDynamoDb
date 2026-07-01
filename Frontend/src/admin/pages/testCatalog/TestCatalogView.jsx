import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetTestCatalogById } from "../../api/adminTestCatalog.js";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { formatDate } from "./TestCatalogShared.js";

export function TestCatalogView() {
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
  if (!test) return null;

  return (
    <div className="user-page">
      <AdminPageHeader title={test.name} subtitle={`Test ID: ${test.testId}`} backTo="/admin/test-catalog" />
      <div className="page-card">
        <dl className="detail-list">
          <div>
            <dt>Type</dt>
            <dd>{test.type}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{test.category}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <AdminStatusBadge status={test.status} />
            </dd>
          </div>
          <div>
            <dt>Sequence</dt>
            <dd>{test.sequence ?? 0}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(test.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(test.updatedAt)}</dd>
          </div>
        </dl>

        <h3 className="form-card__title" style={{ marginTop: 24 }}>
          Parameters
        </h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Param ID</th>
                <th>Unit</th>
                <th>Reference range</th>
              </tr>
            </thead>
            <tbody>
              {(test.parameters || []).map((p) => (
                <tr key={p.paramId || p.name}>
                  <td>{p.name}</td>
                  <td className="data-table__muted">{p.paramId}</td>
                  <td>{p.unit || "—"}</td>
                  <td>{p.refRange || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="user-form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/test-catalog")}>
            Back to list
          </button>
          <button type="button" className="btn btn--primary" onClick={() => navigate(`/admin/test-catalog/${test._id || testId}/edit`)}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
