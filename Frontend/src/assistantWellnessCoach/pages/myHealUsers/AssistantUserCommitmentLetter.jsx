import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCommitmentLetterPanel } from "../../../components/UserCommitmentLetterPanel.jsx";
import { assistantGetUserCommitmentLetter } from "../../api/assistantCommitmentLetters.js";

export function AssistantUserCommitmentLetter({ embedded = false }) {
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const { userId } = useParams();

  return (
    <UserCommitmentLetterPanel
      token={assistantToken}
      userId={userId}
      fetchLetter={assistantGetUserCommitmentLetter}
      embedded={embedded}
    />
  );
}
