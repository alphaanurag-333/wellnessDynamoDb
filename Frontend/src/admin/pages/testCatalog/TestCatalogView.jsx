import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetTestCatalogById } from "../../api/adminTestCatalog.js";
import { AdminPageHeader, AdminStatusBadge, TableCellText } from "../../components/AdminCrud.jsx";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, typeLabel } from "./TestCatalogShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function TestCatalogView() {
  const { testId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [test, setTest] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !testId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetTestCatalogById(adminToken, testId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setTest(row);
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
        setError(e.message || "Failed to load test.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, testId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/test-catalog")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!test) {
    return <AdminPageLoadingState label="Loading test…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Test catalog details"
        subtitle="View this test and its parameters."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit test
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Name" value={test.name} />
          <DetailRow label="Test ID" value={test.testId} />
          <DetailRow label="Type" value={typeLabel(test.type)} />
          <DetailRow label="Category" value={test.category} />
          <DetailRow label="Sequence" value={test.sequence ?? 0} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={test.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(test.createdAt)} />
          <DetailRow label="Updated" value={formatDate(test.updatedAt)} />
        </div>

        <h3 className="form-card__title" style={{ marginTop: 24 }}>
          Parameters ({Array.isArray(test.parameters) ? test.parameters.length : 0})
        </h3>
        <div className="table-scroll" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Name</th>
                <th>Param ID</th>
                <th>Unit</th>
                <th>Reference range</th>
              </tr>
            </thead>
            <tbody>
              {(test.parameters || []).length === 0 ? (
                <tr>
                  <td colSpan={5}>No parameters.</td>
                </tr>
              ) : (
                (test.parameters || []).map((p, idx) => (
                  <tr key={p.paramId || p.name || idx}>
                    <td className="data-table__muted">{idx + 1}</td>
                    <td><TableCellText value={p.name} /></td>
                    <td className="data-table__muted"><TableCellText value={p.paramId} /></td>
                    <td><TableCellText value={p.unit} max={32} /></td>
                    <td><TableCellText value={p.refRange} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
