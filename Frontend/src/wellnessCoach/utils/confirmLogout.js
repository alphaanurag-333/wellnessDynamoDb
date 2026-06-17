import Swal from "sweetalert2";

export async function confirmCoachLogout() {
  const result = await Swal.fire({
    title: "Sign out?",
    text: "You will need to sign in again to access the wellness coach portal.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign out",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ea580c",
  });
  return result.isConfirmed;
}
