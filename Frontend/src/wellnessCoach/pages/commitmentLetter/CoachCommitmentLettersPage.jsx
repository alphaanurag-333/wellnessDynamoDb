import { useDispatch, useSelector } from "react-redux";
import { logoutCoach } from "../../../store/authSlice.js";
import { PortalCommitmentLettersPage } from "../../../components/PortalCommitmentLettersPage.jsx";
import {
  coachDeleteCommitmentLetter,
  coachListCommitmentLetters,
  coachListPendingCommitmentLetters,
  coachReviewCommitmentLetter,
} from "../../api/coachCommitmentLetters.js";

export function CoachCommitmentLettersPage() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <PortalCommitmentLettersPage
      token={coachToken}
      onUnauthorized={() => dispatch(logoutCoach())}
      listPending={coachListPendingCommitmentLetters}
      listAll={coachListCommitmentLetters}
      reviewLetter={coachReviewCommitmentLetter}
      deleteLetter={coachDeleteCommitmentLetter}
      title="Client commitment letters"
    />
  );
}
