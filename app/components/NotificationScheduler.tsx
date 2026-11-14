"use client";

import { useCallback, useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { loadAppSettings } from "@/app/lib/services/insights";
import { loadDiaries } from "@/app/lib/services/database";

const TIPS = [
  "Đừng quên tưới cây nhé!",
  "Kiểm tra lá xem có dấu hiệu bất thường nào không.",
  "Một chút chăm sóc mỗi ngày giúp cây khỏe mạnh hơn.",
  "Đảm bảo cây nhận đủ ánh sáng phù hợp.",
];
const STREAK_ID = 81001;
const TIP_ID = 81002;
const LAST_STREAK_KEY = "rice-diary-last-streak-notice";
const LAST_TIP_KEY = "rice-diary-last-tip-notice";
const SCHEDULE_SIGNATURE = "rice-diary-notification-schedule";

function nextLocalTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
}

async function notify(title: string, body: string) {
  if (isTauri()) {
    const notifications = await import("@tauri-apps/plugin-notification");
    if (!(await notifications.isPermissionGranted())) return false;
    notifications.sendNotification({ title, body });
    return true;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  new Notification(title, { body });
  return true;
}

async function scheduleMobile(settings: Awaited<ReturnType<typeof loadAppSettings>>) {
  if (!isTauri() || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
  const plugin = await import("@tauri-apps/plugin-notification");
  if (!(await plugin.isPermissionGranted())) return;
  const current = await plugin.pending().catch(() => []);
  const owned = current.filter((item) => item.id === STREAK_ID || item.id === TIP_ID).map((item) => item.id);
  if (owned.length) await plugin.cancel(owned);

  const signature = JSON.stringify([settings.streakEnabled, settings.streakFrequencyHours, settings.tipsEnabled, settings.reminderTime]);
  if (localStorage.getItem(SCHEDULE_SIGNATURE) === signature) return;
  if (settings.streakEnabled) {
    const first = new Date(Date.now() + settings.streakFrequencyHours * 60 * 60 * 1000);
    plugin.sendNotification({
      id: STREAK_ID,
      title: "Nhắc chăm sóc cây 🌱",
      body: "Hãy ghi nhật ký hôm nay để duy trì chuỗi chăm sóc cây nhé!",
      schedule: plugin.Schedule.at(first, true, true),
    });
  }
  if (settings.tipsEnabled) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const [hour, minute] = settings.reminderTime.split(":").map(Number);
    plugin.sendNotification({
      id: TIP_ID,
      title: "Mẹo nhỏ cho cây lúa 🌾",
      body: tip,
      schedule: plugin.Schedule.interval({ hour, minute }, true),
    });
  }
  localStorage.setItem(SCHEDULE_SIGNATURE, signature);
}

export default function NotificationScheduler() {
  const running = useRef(false);
  const check = useCallback(async () => {
    if (running.current || typeof window === "undefined") return;
    running.current = true;
    try {
      const settings = await loadAppSettings();
      await scheduleMobile(settings);
      // On desktop and web, deliver reminders while the application is open.
      if (!isTauri() || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const diaries = await loadDiaries();
        const now = Date.now();
        const today = new Date().toLocaleDateString("sv-SE");
        if (settings.streakEnabled) {
          const needingEntry = diaries.filter((diary) => diary.last_active_date < Math.floor(new Date().setHours(0, 0, 0, 0) / 1000));
          const lastSent = Number(localStorage.getItem(LAST_STREAK_KEY) || 0);
          if (needingEntry.length && now - lastSent >= settings.streakFrequencyHours * 60 * 60 * 1000) {
            if (await notify("Giữ chuỗi chăm sóc cây 🌱", `Hãy ghi nhật ký hôm nay cho ${needingEntry[0].diary_name} nhé!`)) localStorage.setItem(LAST_STREAK_KEY, String(now));
          }
        }
        if (settings.tipsEnabled && localStorage.getItem(LAST_TIP_KEY) !== today) {
          const [hour, minute] = settings.reminderTime.split(":").map(Number);
          const current = new Date();
          if (current.getHours() > hour || (current.getHours() === hour && current.getMinutes() >= minute)) {
            const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
            if (await notify("Mẹo nhỏ cho cây lúa 🌾", tip)) localStorage.setItem(LAST_TIP_KEY, today);
          }
        }
      }
    } catch (error) {
      console.debug("Không thể thiết lập lời nhắc", error);
    } finally { running.current = false; }
  }, []);
  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), 60_000);
    window.addEventListener("rice-diary-settings-changed", check);
    return () => { clearInterval(timer); window.removeEventListener("rice-diary-settings-changed", check); };
  }, [check]);
  return null;
}
