import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetUser } from "../../api/adminUsers.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { UserProfileForm } from "./UserAdd.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";

export function UserEdit() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!adminToken || !userId) return;
    let cancelled = false;
    (async () => {
      setLoadError("");
      setNotFound(false);
      setLoading(true);
      try {
        const u = await adminGetUser(adminToken, userId);
        if (cancelled) return;
        if (!u) {
          setNotFound(true);
          return;
        }
        setUser(u);
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
        setLoadError(e.message || "Failed to load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, userId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (loadError) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }

  if (loading) {
    return <UserPageLoadingState label="Loading user…" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit user"
        subtitle="Update this user's profile and account details."
        onBack={() => navigate(-1)}
      />

      <div className="user-page__card">
        <UserProfileForm
          key={user._id}
          mode="edit"
          userId={user._id}
          initialUser={user}
          submitLabel="Save changes"
          onCancel={() => navigate("/admin/users")}
          onSuccess={async () => {
            await Swal.fire({
              icon: "success",
              title: "User updated",
              timer: 1500,
            });
            navigate("/admin/users");
          }}
        />
      </div>
    </div>
  );
}
