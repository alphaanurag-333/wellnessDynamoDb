import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserCommitmentLetterPanel } from "../../../../components/UserCommitmentLetterPanel.jsx";
import { adminGetUserCommitmentLetter } from "../../../api/adminHealCommitmentLetters.js";

export function AdminUserCommitmentLetter({ embedded = false }) {
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { userId } = useParams();

  return (
    <UserCommitmentLetterPanel
      token={adminToken}
      userId={userId}
      fetchLetter={adminGetUserCommitmentLetter}
      embedded={embedded}
    />
  );
}
