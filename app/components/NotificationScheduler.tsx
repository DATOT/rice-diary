"use client";

import { useEffect, useRef } from "react";
import { loadAppSettings } from "@/app/lib/services/insights";
import { loadDiaries } from "@/app/lib/services/database";

const TIPS = ["Đừng quên tưới cây nhé!", "Kiểm tra lá xem có dấu hiệu bất thường nào không.", "Một chút chăm sóc mỗi ngày giúp cây khỏe mạnh hơn.", "Đảm bảo cây nhận đủ ánh sáng phù hợp."];

export default function NotificationScheduler() {
  const lastStreakNotice = useRef(0);
  const lastTipNotice = useRef("");
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;
    const run = async () => {
      if (!alive || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      try {
        const settings = await loadAppSettings();
        const diaries = await loadDiaries();
        const now = Date.now();
        const today = new Date().toISOString().slice(0, 10);
        if (settings.streakEnabled && now - lastStreakNotice.current >= settings.streakFrequencyHours * 60 * 60 * 1000) {
          const needingEntry = diaries.filter((diary) => diary.last_active_date < Math.floor(new Date().setHours(0, 0, 0, 0) / 1000));
          if (needingEntry.length) {
            new Notification("Giữ chuỗi chăm sóc cây 🌱", { body: `Hãy ghi nhật ký hôm nay cho ${needingEntry[0].diary_name} nhé!` });
            lastStreakNotice.current = now;
          }
        }
        if (settings.tipsEnabled && lastTipNotice.current !== today) {
          const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
          new Notification("Mẹo nhỏ cho cây lúa 🌾", { body: tip });
          lastTipNotice.current = today;
        }
      } catch (error) { console.debug("Không thể kiểm tra lời nhắc", error); }
    };
    void run();
    timer = setInterval(() => void run(), 60 * 60 * 1000);
    return () => { alive = false; if (timer) clearInterval(timer); };
  }, []);
  return null;
}
