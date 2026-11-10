import React from "react";
import { PiFireDuotone } from "react-icons/pi";

interface Props {
  streak: boolean;
  size?: string | number;
  className?: string;
}
const StreakIcon = ({ streak, size, className }: Props) => {
  return (
    <div>
      <PiFireDuotone
        color={streak ? "#ffa722" : "aaaaaa"}
        size={size}
        className={className}
      />
    </div>
  );
};

export default StreakIcon;
