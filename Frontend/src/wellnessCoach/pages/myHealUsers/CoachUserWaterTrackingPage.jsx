import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { coachGetUserWaterTracking } from "../../api/coachWaterTracking.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { WaterTrackingHistoryPanel } from "../../../components/WaterTrackingHistoryPanel.jsx";
import { TRACKING_HISTORY_DEFAULT_DAYS } from "../../../components/trackingHistoryStats.js";
import { useRegisterHeaderRefresh } from "../../../hooks/useRegisterHeaderRefresh.js";

export function CoachUserWaterTrackingPage({ embedded = false }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);

  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(null);
  const [days, setDays] = useState(TRACKING_HISTORY_DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const handleRefresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!coachToken || !userId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setNotFound(false);
      setLoading(true);
      try {
        const result = await coachGetUserWaterTracking(coachToken, userId, { days });
        if (cancelled) return;
        setUser(result.user);
        setSettings(result.data?.settings ?? {});
        setHistory(result.data?.history ?? []);
        setRange(result.data?.range ?? null);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logoutCoach());
          return;
        }
        if (e?.status === 404 || e?.status === 403) {
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
  }, [coachToken, dispatch, userId, days, reloadKey]);

  useRegisterHeaderRefresh({ onRefresh: handleRefresh, refreshing: loading });

  if (notFound) return <NotFoundPage />;

  if (loading && !history.length) {
    return <CoachPageLoadingState label="Loading water tracking…" />;
  }

  return (
    <WaterTrackingHistoryPanel
      title="Client water tracking"
      subtitle="Day-wise hydration history for this client."
      user={user}
      settings={settings}
      history={history}
      range={range}
      loading={loading}
      error={error}
      days={days}
      onDaysChange={setDays}
      onBack={embedded ? undefined : () => navigate("/coach/my-users")}
      backLabel="Back to clients"
    />
  );
}
