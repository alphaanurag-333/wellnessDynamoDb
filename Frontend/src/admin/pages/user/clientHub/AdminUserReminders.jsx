import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserRemindersPanel } from "../../../../components/UserRemindersPanel.jsx";
import { UserPageLoadingState } from "../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateUserReminder,
  adminDeleteUserReminder,
  adminListUserReminders,
  adminToggleUserReminder,
  adminUpdateUserReminder,
} from "../../../api/adminHealReminders.js";

const reminderApi = {
  list: adminListUserReminders,
  create: adminCreateUserReminder,
  update: adminUpdateUserReminder,
  toggle: adminToggleUserReminder,
  remove: adminDeleteUserReminder,
};

export function AdminUserReminders({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserRemindersPanel
      token={adminToken}
      userId={userId}
      api={reminderApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
