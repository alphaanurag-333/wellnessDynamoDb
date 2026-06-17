import { MdGroups } from "react-icons/md";
import { IoStorefrontOutline } from "react-icons/io5";

export function audienceIcon(type, size = 16) {
  if (type === "coaches") return <IoStorefrontOutline size={size} />;
  return <MdGroups size={size} />;
}
