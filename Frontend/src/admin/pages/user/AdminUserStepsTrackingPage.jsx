import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { adminGetUserStepsTracking } from "../../api/adminStepsTracking.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";
import { StepsTrackingHistoryPanel } from "../../../components/StepsTrackingHistoryPanel.jsx";

export function AdminUserStepsTrackingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(null);
  const [connections, setConnections] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !userId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setNotFound(false);
      setLoading(true);
      try {
        const result = await adminGetUserStepsTracking(adminToken, userId, { days });
        if (cancelled) return;
        setUser(result.user);
        setSettings(result.data?.settings ?? {});
        setHistory(result.data?.history ?? []);
        setRange(result.data?.range ?? null);
        setConnections(result.data?.connections ?? null);
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
        setError(e.message || "Failed to load steps tracking history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, userId, days]);

  if (notFound) return <NotFoundPage />;

  if (loading && !history.length) {
    return <UserPageLoadingState label="Loading steps tracking…" />;
  }

  return (
    <StepsTrackingHistoryPanel
      title="Steps tracking history"
      subtitle="Day-wise step counts synced from the user's mobile device."
      user={user}
      settings={settings}
      history={history}
      range={range}
      connections={connections}
      loading={loading}
      error={error}
      days={days}
      onDaysChange={setDays}
      onBack={() => navigate(`/admin/users/${userId}`)}
    />
  );
}
