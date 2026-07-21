import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { adminGetUserWaterTracking } from "../../api/adminWaterTracking.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";
import { WaterTrackingHistoryPanel } from "../../../components/WaterTrackingHistoryPanel.jsx";
import { TRACKING_HISTORY_DEFAULT_DAYS } from "../../../components/trackingHistoryStats.js";
import { useRegisterHeaderRefresh } from "../../../hooks/useRegisterHeaderRefresh.js";

export function AdminUserWaterTrackingPage({ embedded = false }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(null);
  const [days, setDays] = useState(TRACKING_HISTORY_DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const handleRefresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!adminToken || !userId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setNotFound(false);
      setLoading(true);
      try {
        const result = await adminGetUserWaterTracking(adminToken, userId, { days });
        if (cancelled) return;
        setUser(result.user);
        setSettings(result.data?.settings ?? {});
        setHistory(result.data?.history ?? []);
        setRange(result.data?.range ?? null);
        setLastRefreshedAt(new Date());
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
        setError(e.message || "Failed to load water tracking history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, userId, days, reloadKey]);

  useRegisterHeaderRefresh({
    onRefresh: embedded ? null : handleRefresh,
    refreshing: loading,
    lastRefreshedAt,
  });

  if (notFound) return <NotFoundPage />;

  if (loading && !history.length) {
    return <UserPageLoadingState label="Loading water tracking…" />;
  }

  return (
    <WaterTrackingHistoryPanel
      title="Water tracking history"
      subtitle="Day-wise hydration logs for this user."
      user={user}
      settings={settings}
      history={history}
      range={range}
      loading={loading}
      error={error}
      days={days}
      onDaysChange={setDays}
      onBack={embedded ? undefined : () => navigate(-1)}
      backLabel="Back to user"
    />
  );
}
