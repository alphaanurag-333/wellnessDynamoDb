import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserWellnessPrescriptionPanel } from "../../../components/UserWellnessPrescriptionPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateWellnessPrescription,
  coachDeleteWellnessPrescription,
  coachListUserWellnessPrescriptions,
} from "../../api/coachWellnessPrescriptions.js";

const wellnessPrescriptionApi = {
  list: coachListUserWellnessPrescriptions,
  create: coachCreateWellnessPrescription,
  remove: coachDeleteWellnessPrescription,
};

export function UserWellnessPrescriptions({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserWellnessPrescriptionPanel
      token={coachToken}
      userId={userId}
      api={wellnessPrescriptionApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
