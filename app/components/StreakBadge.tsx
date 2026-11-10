import { PiFireDuotone } from "react-icons/pi";

interface Props {
  onStreak: boolean;
  streak: number;
  className?: string;
}
const StreakBadge = ({ streak, onStreak, className }: Props) => {
  return onStreak ? (
    <div className={`flex badge badge-sm bg-[#94512a5d] ${className}`}>
      {streak}
      <PiFireDuotone color={"#ffa722"} size={12} />
    </div>
  ) : (
    <div
      className={`flex badge badge-sm badge-dash border-[#919191] ${className}`}
    >
      {streak}
      <PiFireDuotone color={"#aaaaaa"} size={12} />
    </div>
  );
};

export default StreakBadge;
