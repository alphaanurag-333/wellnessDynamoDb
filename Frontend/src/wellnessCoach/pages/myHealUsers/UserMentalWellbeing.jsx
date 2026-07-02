import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserMentalWellbeingPanel } from "../../../components/UserMentalWellbeingPanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachAssignMentalWellbeing,
  coachListUserMentalWellbeing,
  coachRemoveMentalWellbeing,
} from "../../api/coachMentalWellbeing.js";

const mentalWellbeingApi = {
  list: coachListUserMentalWellbeing,
  assign: coachAssignMentalWellbeing,
  remove: coachRemoveMentalWellbeing,
};

export function UserMentalWellbeing({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserMentalWellbeingPanel
      token={coachToken}
      userId={userId}
      api={mentalWellbeingApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
