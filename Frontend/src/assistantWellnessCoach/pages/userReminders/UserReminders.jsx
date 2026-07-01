import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserRemindersPanel } from "../../../components/UserRemindersPanel.jsx";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantCreateUserReminder,
  assistantDeleteUserReminder,
  assistantListUserReminders,
  assistantToggleUserReminder,
  assistantUpdateUserReminder,
} from "../../api/reminderController.js";

const reminderApi = {
  list: assistantListUserReminders,
  create: assistantCreateUserReminder,
  update: assistantUpdateUserReminder,
  toggle: assistantToggleUserReminder,
  remove: assistantDeleteUserReminder,
};

export function UserReminders({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <UserRemindersPanel
      token={assistantToken}
      userId={userId}
      api={reminderApi}
      backTo={embedded ? null : "/assistant/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutAssistant())}
    />
  );
}
