"use client";
import React, { ReactElement } from "react";
import { PiPlantFill } from "react-icons/pi";
import { IoPieChart } from "react-icons/io5";
import { MdSettings } from "react-icons/md";
import { usePathname } from "next/navigation";
import { IconType } from "react-icons";
import { useNoteCreation } from "../contexts/NoteCreationContext";

interface Nav {
  goto: string;
  icon: IconType;
  label: string;
}

const navigations: Nav[] = [
  {
    goto: "diary",
    icon: PiPlantFill,
    label: "Nhật ký",
  },
  {
    goto: "settings",
    icon: MdSettings,
    label: "Cài đặt",
  },
];
const AppNavbar = ({ disabled }: { disabled?: boolean }) => {
  const path = usePathname().split("/")[1];
  const { submitting } = useNoteCreation();
  // excluding
  if (["camera"].includes(path)) {
    return <></>;
  }

  return (
    <div className="dock">
      {navigations.map((val, idx) => (
        <a
          key={idx}
          className={`${(disabled || submitting) && "pointer-events-none"} ${path == val.goto ? "dock-active" : ""}`}
          href={`/${val.goto}`}
        >
          <val.icon size="18pt" />
          <span className="dock-label">{val.label}</span>
        </a>
      ))}
    </div>
  );
};

export default AppNavbar;
