"use client";

import { motion, Calendar, DateMode } from "vanilla-calendar-pro";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  createdAt: Date;
  streaks: Date[];
  selectionMethod?: DateMode;
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
  onClickDate?: (self: Calendar, event: MouseEvent) => void;
  calendarInstanceRef?: RefObject<Calendar | null>;
}

const StreakCalendarInput = ({
  createdAt,
  selectionMethod = "multiple",
  streaks,
  selectedDates,
  onChange,
  onClickDate,
  calendarInstanceRef,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const createdAtTime = createdAt.getTime();
  const streakKey = streaks.map((d) => d.getTime()).join(",");
  const selectedKey = selectedDates.map((d) => d.getTime()).join(",");

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);

    const calendar = new Calendar(containerRef.current, {
      locale: "vi-VN",
      extensions: [motion],
      enableSwipe: true,

      dateMin: new Date(createdAtTime),
      dateMax: today,

      selectionDatesMode: selectionMethod,

      disableAllDates: true,
      enableDates: [today, ...streaks],
      selectedDates: selectedDates.map(
        (d: Date) => d.toISOString().split("T")[0],
      ),

      onClickDate: (self: Calendar, event: MouseEvent) => {
        if (self.selectedDates) {
          onChange(
            self.selectedDates.map((d: string | number | Date) => new Date(d)),
          );
        }
        if (onClickDate) {
          onClickDate(self, event);
        }
      },
    });

    if (calendarInstanceRef) {
      calendarInstanceRef.current = calendar;
    }

    calendar.init();
    calendar.show();

    setLoading(false);

    return () => {
      if (calendarInstanceRef?.current === calendar) {
        calendarInstanceRef.current = null;
      }
    };
  }, [
    createdAtTime,
    streakKey,
    selectedKey,
    selectionMethod,
    onClickDate,
    calendarInstanceRef,
    today,
    streaks,
    selectedDates,
    onChange,
  ]);

  return (
    <div className="flex flex-col items-center">
      {loading && <div className="skeleton w-full h-42" />}
      <div ref={containerRef} />
    </div>
  );
};

export default StreakCalendarInput;
