import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { UserSupplementDosagePanel } from "../../../components/UserSupplementDosagePanel.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachCreateSupplementDosage,
  coachListUserSupplementDosages,
  coachStopSupplementDosage,
} from "../../api/coachSupplementDosage.js";

const supplementDosageApi = {
  list: coachListUserSupplementDosages,
  create: coachCreateSupplementDosage,
  stop: coachStopSupplementDosage,
};

export function UserSupplementDosage({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <UserSupplementDosagePanel
      token={coachToken}
      userId={userId}
      api={supplementDosageApi}
      backTo={embedded ? null : "/coach/my-users"}
      PageLoader={CoachPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logoutCoach())}
    />
  );
}
