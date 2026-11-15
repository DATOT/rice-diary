"use client";
import Link from "next/link";
import { PiPlantFill } from "react-icons/pi";
import { IoPieChart } from "react-icons/io5";
import { MdSettings } from "react-icons/md";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { useNoteCreation } from "../contexts/NoteCreationContext";

interface Nav {
  goto: string;
  icon: IconType;
  label: string;
}

const navigations: Nav[] = [
  { goto: "diary", icon: PiPlantFill, label: "Nhật ký" },
  { goto: "charts", icon: IoPieChart, label: "Biểu đồ" },
  { goto: "settings", icon: MdSettings, label: "Cài đặt" },
];

export default function AppNavbar({ disabled }: { disabled?: boolean }) {
  const path = usePathname().split("/")[1];
  const { submitting } = useNoteCreation();
  if (["camera"].includes(path)) return null;

  return (
    <nav
      aria-label="Điều hướng chính"
      className="dock z-40 border-t border-base-300 bg-base-100/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-sm"
    >
      {navigations.map((item) => {
        const active = path === item.goto;
        return (
          <Link
            key={item.goto}
            href={`/${item.goto}`}
            aria-current={active ? "page" : undefined}
            className={`${disabled || submitting ? "pointer-events-none opacity-50" : ""} ${active ? "dock-active bg-base-200 text-base-content" : "text-base-content/75 hover:bg-base-200/80"} min-h-14 rounded-box`}
          >
            <item.icon size={22} aria-hidden="true" />
            <span className="dock-label text-xs font-medium sm:text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
