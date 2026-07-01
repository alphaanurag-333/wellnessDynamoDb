import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserRemindersPanel } from "../../../components/UserRemindersPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateUserReminder,
  coachDeleteUserReminder,
  coachListUserReminders,
  coachToggleUserReminder,
  coachUpdateUserReminder,
} from "../../api/reminderController.js";

const reminderApi = {
  list: coachListUserReminders,
  create: coachCreateUserReminder,
  update: coachUpdateUserReminder,
  toggle: coachToggleUserReminder,
  remove: coachDeleteUserReminder,
};

export function UserReminders({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserRemindersPanel
      token={coachToken}
      userId={userId}
      api={reminderApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
