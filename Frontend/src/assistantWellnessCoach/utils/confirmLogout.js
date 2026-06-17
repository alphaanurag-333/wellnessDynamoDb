import Swal from "sweetalert2";

export async function confirmAssistantLogout() {
  const result = await Swal.fire({
    title: "Sign out?",
    text: "You will need to sign in again to access the assistant wellness coach portal.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign out",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ea580c",
  });
  return result.isConfirmed;
}
