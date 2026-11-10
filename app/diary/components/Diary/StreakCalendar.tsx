"use client";
import React, { useEffect, useRef, useState } from "react";
import { Calendar, motion, weeks } from "vanilla-calendar-pro";
import { getDateString } from "vanilla-calendar-pro/utils";

const today = new Date(Date.now());

interface Props {
  createdAt: Date;
  streaks: Date[];
}
const StreakCalendar = ({ createdAt, streaks }: Props) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!calendarRef.current) return;

    const calendar = new Calendar(calendarRef.current, {
      type: "week",
      locale: "vi-VN",
      extensions: [motion, weeks],

      animation: {
        slide: { duration: 400 },
        fade: { duration: 120 },
        collapse: { duration: 300 },
      },

      dateToday: "today",
      enableCollapse: true,
      enableSwipe: true,

      displayDateMin: getDateString(createdAt),
      displayDateMax: getDateString(today),

      selectionDatesMode: false,
      disableAllDates: true,

      enableDates: [`${getDateString(createdAt)}:${getDateString(today)}`],

      selectedDates: streaks,
    });
    calendar.init();
    setLoading(false);
  }, [createdAt, streaks]);

  return (
    <div className="w-full">
      <p className="font-bold">Chuỗi:</p>
      <div className="flex flex-col items-center">
        {loading && <div className="skeleton w-full h-42" />}
        <div ref={calendarRef} />
      </div>
    </div>
  );
};

export default StreakCalendar;
