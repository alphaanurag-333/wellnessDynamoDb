import { MdCelebration } from "react-icons/md";
import { IoTrophyOutline } from "react-icons/io5";

export function celebrationTypeIcon(type, size = 16) {
  if (type === "championship") return <IoTrophyOutline size={size} />;
  return <MdCelebration size={size} />;
}
