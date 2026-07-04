import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCommitmentLetterPanel } from "../../../components/UserCommitmentLetterPanel.jsx";
import { coachGetUserCommitmentLetter } from "../../api/coachCommitmentLetters.js";

export function UserCommitmentLetter({ embedded = false }) {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const { userId } = useParams();

  return (
    <UserCommitmentLetterPanel
      token={coachToken}
      userId={userId}
      fetchLetter={coachGetUserCommitmentLetter}
      embedded={embedded}
    />
  );
}
