import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { assistantGetUserStepsTracking } from "../../api/assistantHealUsers.js";
import { logoutAssistant } from "../../../store/authSlice.js";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { StepsTrackingHistoryPanel } from "../../../components/StepsTrackingHistoryPanel.jsx";

export function AssistantUserStepsTrackingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

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
    if (!assistantToken || !userId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setNotFound(false);
      setLoading(true);
      try {
        const result = await assistantGetUserStepsTracking(assistantToken, userId, { days });
        if (cancelled) return;
        setUser(result.user);
        setSettings(result.data?.settings ?? {});
        setHistory(result.data?.history ?? []);
        setRange(result.data?.range ?? null);
        setConnections(result.data?.connections ?? null);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logoutAssistant());
          return;
        }
        if (e?.status === 404 || e?.status === 403) {
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
  }, [assistantToken, dispatch, userId, days]);

  if (notFound) return <NotFoundPage />;

  return (
    <StepsTrackingHistoryPanel
      title="Client steps tracking"
      subtitle="Day-wise activity history for your assigned client."
      user={user}
      settings={settings}
      history={history}
      range={range}
      connections={connections}
      loading={loading}
      error={error}
      days={days}
      onDaysChange={setDays}
      onBack={() => navigate("/assistant/my-users")}
    />
  );
}
