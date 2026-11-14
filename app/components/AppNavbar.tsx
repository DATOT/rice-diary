"use client";
import React from "react";
import Link from "next/link";
import { PiPlantFill } from "react-icons/pi";
import { IoPieChart } from "react-icons/io5";
import { MdSettings } from "react-icons/md";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { useNoteCreation } from "../contexts/NoteCreationContext";

interface Nav { goto: string; icon: IconType; label: string }
const navigations: Nav[] = [
  { goto: "diary", icon: PiPlantFill, label: "Nhật ký" },
  { goto: "charts", icon: IoPieChart, label: "Biểu đồ" },
  { goto: "settings", icon: MdSettings, label: "Cài đặt" },
];

export default function AppNavbar({ disabled }: { disabled?: boolean }) {
  const path = usePathname().split("/")[1];
  const { submitting } = useNoteCreation();
  if (["camera"].includes(path)) return null;
  return <nav aria-label="Điều hướng chính" className="dock z-40">
    {navigations.map((item) => <Link key={item.goto} href={`/${item.goto}`} aria-current={path === item.goto ? "page" : undefined}
      className={`${(disabled || submitting) ? "pointer-events-none opacity-50" : ""} ${path === item.goto ? "dock-active" : ""} min-h-14`}>
      <item.icon size="18pt" /><span className="dock-label">{item.label}</span>
    </Link>)}
  </nav>;
}
