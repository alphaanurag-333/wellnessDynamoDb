import { useDispatch, useSelector } from "react-redux";
import { logoutAssistant } from "../../../store/authSlice.js";
import { PortalCommitmentLettersPage } from "../../../components/PortalCommitmentLettersPage.jsx";
import {
  assistantDeleteCommitmentLetter,
  assistantListCommitmentLetters,
  assistantListPendingCommitmentLetters,
  assistantReviewCommitmentLetter,
} from "../../api/assistantCommitmentLetters.js";

export function AssistantCommitmentLettersPage() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <PortalCommitmentLettersPage
      token={assistantToken}
      onUnauthorized={() => dispatch(logoutAssistant())}
      listPending={assistantListPendingCommitmentLetters}
      listAll={assistantListCommitmentLetters}
      reviewLetter={assistantReviewCommitmentLetter}
      deleteLetter={assistantDeleteCommitmentLetter}
      title="Client commitment letters"
    />
  );
}
