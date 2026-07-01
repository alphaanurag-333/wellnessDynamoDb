import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetPrakrutiThingToAvoidById } from "../../api/adminPrakrutiThingsToAvoid.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { PrakrutiThingToAvoidForm } from "./PrakrutiThingToAvoidAdd.jsx";

export function PrakrutiThingToAvoidEdit() {
  const { thingToAvoidId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !thingToAvoidId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await adminGetPrakrutiThingToAvoidById(adminToken, thingToAvoidId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setItem(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) return dispatch(logout());
        if (e?.status === 404) return setNotFound(true);
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load." });
        navigate("/admin/prakruti-things-to-avoid");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, thingToAvoidId, navigate]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit thing to avoid" subtitle="Update this Prakruti item." backTo="/admin/prakruti-things-to-avoid" />
      <div className="page-card">
        {loading ? (
          <AdminPageLoader label="Loading…" />
        ) : item ? (
          <PrakrutiThingToAvoidForm mode="edit" initialItem={item} key={item._id || thingToAvoidId} />
        ) : null}
      </div>
    </div>
  );
}
