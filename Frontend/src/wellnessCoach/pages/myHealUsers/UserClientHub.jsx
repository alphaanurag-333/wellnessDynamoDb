import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { ClientHubPage } from "../../../components/ClientHubPage.jsx";
import { coachGetUserWaterTracking } from "../../api/coachWaterTracking.js";
import { coachListAssistants } from "../../api/coachAssistants.js";
import { coachReassignHealUser } from "../../api/coachHealUsers.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachUserWaterTrackingPage } from "./CoachUserWaterTrackingPage.jsx";
import { CoachUserStepsTrackingPage } from "./CoachUserStepsTrackingPage.jsx";
import { UserReminders } from "../userReminders/UserReminders.jsx";
import { UserDietPlan } from "./UserDietPlan.jsx";
import { UserTestRecommendations } from "./UserTestRecommendations.jsx";
import { UserPhysicalExercises } from "./UserPhysicalExercises.jsx";
import { CoachUserMealTrackingPage } from "./CoachUserMealTrackingPage.jsx";
import { UserLaunchAssessment } from "./UserLaunchAssessment.jsx";
import { UserPrakrutiAssessment } from "./UserPrakrutiAssessment.jsx";

function renderCoachTab(tab, embedded) {
  switch (tab) {
    case "water":
      return <CoachUserWaterTrackingPage embedded={embedded} />;
    case "steps":
      return <CoachUserStepsTrackingPage embedded={embedded} />;
    case "reminders":
      return <UserReminders embedded={embedded} />;
    case "diet-plan":
      return <UserDietPlan embedded={embedded} />;
    case "internal-parameters":
      return <UserTestRecommendations embedded={embedded} />;
    case "physical-exercises":
      return <UserPhysicalExercises embedded={embedded} />;
    case "meal-tracking":
      return <CoachUserMealTrackingPage embedded={embedded} />;
    case "launch-assessment":
      return <UserLaunchAssessment embedded={embedded} />;
    case "prakruti-assessment":
      return <UserPrakrutiAssessment embedded={embedded} />;
    default:
      return null;
  }
}

export function UserClientHub() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const coach = useSelector((s) => s.auth.coach);
  const coachId = coach?._id || coach?.id;
  const [assistants, setAssistants] = useState([]);
  const [reassignUser, setReassignUser] = useState(null);
  const [reassignAssistantId, setReassignAssistantId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (!coachToken) return;
    (async () => {
      try {
        const { assistants: rows } = await coachListAssistants(coachToken, { status: "active", limit: 100 });
        setAssistants(rows || []);
      } catch {
        setAssistants([]);
      }
    })();
  }, [coachToken]);

  const fetchUser = useCallback(
    async (userId) => {
      if (!coachToken) return null;
      try {
        const result = await coachGetUserWaterTracking(coachToken, userId, { days: 7 });
        return result.user;
      } catch (e) {
        if (e?.status === 401) dispatch(logoutCoach());
        throw e;
      }
    },
    [coachToken, dispatch]
  );

  const submitReassign = async () => {
    if (!coachToken || !reassignUser) return;
    const userId = reassignUser._id || reassignUser.id;
    setReassigning(true);
    try {
      const payload =
        reassignAssistantId && reassignAssistantId !== coachId
          ? {
              assignedCoachId: reassignAssistantId,
              assignedCoachType: "assistant_wellness_coach",
              parentCoachId: coachId,
            }
          : {
              assignedCoachId: coachId,
              assignedCoachType: "wellness_coach",
              parentCoachId: coachId,
            };
      await coachReassignHealUser(coachToken, userId, payload);
      await Swal.fire({ icon: "success", title: "User reassigned", timer: 1500 });
      setReassignUser(null);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message || "Could not reassign." });
    } finally {
      setReassigning(false);
    }
  };

  return (
    <>
      <ClientHubPage
        listPath="/coach/my-users"
        fetchUser={fetchUser}
        showReassign
        onReassign={setReassignUser}
        renderTab={(tab, { embedded }) => renderCoachTab(tab, embedded)}
      />

      {reassignUser ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 className="modal-card__title">Reassign {reassignUser.name || "client"}</h3>
            <label className="user-field">
              <span className="user-field__label">Assign to</span>
              <select
                className="user-field__input"
                value={reassignAssistantId || coachId}
                onChange={(e) => setReassignAssistantId(e.target.value)}
              >
                <option value={coachId}>Myself (Wellness Coach)</option>
                {assistants.map((a) => (
                  <option key={a._id || a.id} value={a._id || a.id}>
                    {a.name} {a.designation ? `· ${a.designation}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setReassignUser(null)} disabled={reassigning}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={submitReassign} disabled={reassigning}>
                {reassigning ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
