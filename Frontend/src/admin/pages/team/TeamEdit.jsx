import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetTeamMemberById } from "../../api/teamApi.js";
import { logout } from "../../../store/authSlice.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { TeamForm } from "./TeamAdd.jsx";
import { getTeamMemberId } from "./TeamShared.js";

export function TeamEdit() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canEdit } = useResourcePermissions("team");
  const [member, setMember] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !memberId || !canEdit) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetTeamMemberById(adminToken, memberId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setMember(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404 || e?.status === 403) {
          setNotFound(true);
          return;
        }
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load team member." });
        navigate("/admin/team");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, memberId, canEdit]);

  if (!canEdit || notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit team member" subtitle="Update this account's details and role." backTo="/admin/team" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading team member..." />
          </div>
        ) : member ? (
          <TeamForm mode="edit" initialMember={member} key={getTeamMemberId(member) || memberId} />
        ) : null}
      </div>
    </div>
  );
}
