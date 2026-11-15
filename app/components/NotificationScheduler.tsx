"use client";

import { useCallback, useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { loadAppSettings } from "@/app/lib/services/insights";
import { loadDiaries } from "@/app/lib/services/database";

const STREAK_ID = 81001;
const TIP_ID = 81002;
const LAST_STREAK_KEY = "rice-diary-last-streak-notice";
const LAST_TIP_KEY = "rice-diary-last-tip-notice";
const SCHEDULE_SIGNATURE = "rice-diary-notification-schedule";

const STREAK_NOTICES = [
  {
    title: "Nhắc chăm sóc cây 🌱",
    body: "Hãy ghi nhật ký hôm nay để lưu lại quá trình phát triển của cây nhé!",
  },
  {
    title: "Đừng quên thăm cây hôm nay 🌿",
    body: "Một lần ghi nhật ký giúp bạn theo dõi chuỗi chăm sóc và tình trạng cây.",
  },
  {
    title: "Cây đang chờ bạn đó 🌾",
    body: "Dành chút thời gian kiểm tra cây và ghi lại những thay đổi hôm nay nhé.",
  },
  {
    title: "Giữ chuỗi chăm sóc cây ✨",
    body: "Ghi nhật ký hôm nay để tiếp tục theo dõi hành trình chăm sóc cây.",
  },
];

const TIP_NOTICES = [
  {
    title: "Mẹo nhỏ cho cây lúa 🌾",
    body: "Đừng quên tưới cây khi đất bắt đầu khô nhé.",
  },
  {
    title: "Một chút chăm sóc mỗi ngày 🌱",
    body: "Kiểm tra mặt dưới của lá để phát hiện sớm dấu hiệu sâu bệnh.",
  },
  {
    title: "Góc chăm sóc cây 🌿",
    body: "Đảm bảo cây nhận đủ ánh sáng phù hợp với giai đoạn phát triển.",
  },
  {
    title: "Mẹo cho cây khỏe 🍃",
    body: "Quan sát màu sắc và hình dáng lá để nhận ra thay đổi bất thường.",
  },
  {
    title: "Đừng quên kiểm tra đất 💧",
    body: "Giữ đất đủ ẩm, nhưng tránh tưới quá nhiều làm cây bị úng.",
  },
  {
    title: "Chăm cây một chút nhé ☀️",
    body: "Dọn cỏ dại quanh cây để giảm cạnh tranh nước và chất dinh dưỡng.",
  },
  {
    title: "Mẹo chăm sóc hôm nay 🌼",
    body: "Ghi lại những thay đổi nhỏ của cây để dễ theo dõi theo thời gian.",
  },
  {
    title: "Quan sát cây nào 🔎",
    body: "Kiểm tra thân và lá xem có dấu hiệu hư hại hoặc đốm lạ không.",
  },
  {
    title: "Cây cần bạn 🌱",
    body: "Tưới vào gốc cây để nước đến được vùng rễ.",
  },
  {
    title: "Nhắc nhẹ một chút 🌾",
    body: "Nếu có thể, chụp ảnh cây hôm nay để so sánh với những ngày trước.",
  },
  {
    title: "Chăm cây vui vẻ nhé 💚",
    body: "Cây phát triển tốt hơn khi được chăm sóc đều đặn.",
  },
  {
    title: "Mẹo nhỏ mỗi ngày 🍀",
    body: "Sau mưa lớn, kiểm tra xem đất có thoát nước tốt không.",
  },
];

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function nextLocalTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

async function notify(title: string, body: string): Promise<boolean> {
  if (isTauri()) {
    const notifications = await import("@tauri-apps/plugin-notification");
    if (!(await notifications.isPermissionGranted())) return false;

    notifications.sendNotification({ title, body });
    return true;
  }

  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  new Notification(title, { body });
  return true;
}

async function scheduleMobile(
  settings: Awaited<ReturnType<typeof loadAppSettings>>,
) {
  if (!isTauri() || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return;
  }

  const plugin = await import("@tauri-apps/plugin-notification");
  if (!(await plugin.isPermissionGranted())) return;

  const signature = JSON.stringify([
    settings.streakEnabled,
    settings.streakFrequencyHours,
    settings.tipsEnabled,
    settings.reminderTime,
  ]);

  const current = await plugin.pending().catch(() => []);
  const owned = current.filter(
    (item) => item.id === STREAK_ID || item.id === TIP_ID,
  );
  const pendingIds = new Set(owned.map((item) => item.id));

  const requiredIds = [
    ...(settings.streakEnabled ? [STREAK_ID] : []),
    ...(settings.tipsEnabled ? [TIP_ID] : []),
  ];

  const scheduleIsUnchanged =
    localStorage.getItem(SCHEDULE_SIGNATURE) === signature;
  const allRequiredNotificationsExist = requiredIds.every((id) =>
    pendingIds.has(id),
  );
  const noDisabledNotificationsRemain = owned.every((item) =>
    requiredIds.includes(item.id ?? -1),
  );

  // Keep the existing schedules when settings are unchanged and notifications
  // are still pending. Otherwise, cancel only this app's reminders and rebuild.
  if (
    scheduleIsUnchanged &&
    allRequiredNotificationsExist &&
    noDisabledNotificationsRemain
  ) {
    return;
  }

  if (owned.length > 0) {
    await plugin.cancel(
      owned
        .map((item) => item.id)
        .filter((id): id is number => typeof id === "number"),
    );
  }

  if (settings.streakEnabled) {
    const reminder = randomItem(STREAK_NOTICES);
    plugin.sendNotification({
      id: STREAK_ID,
      title: reminder.title,
      body: reminder.body,
      schedule: plugin.Schedule.interval(
        { hour: settings.streakFrequencyHours },
        true,
        true,
      ),
    });
  }

  if (settings.tipsEnabled) {
    const tip = randomItem(TIP_NOTICES);
    plugin.sendNotification({
      id: TIP_ID,
      title: tip.title,
      body: tip.body,
      schedule: plugin.Schedule.at(
        nextLocalTime(settings.reminderTime),
        true,
        true,
      ),
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
      if (
        !isTauri() ||
        !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ) {
        const diaries = await loadDiaries();
        const now = Date.now();
        const today = new Date().toLocaleDateString("sv-SE");

        if (settings.streakEnabled) {
          const startOfToday = Math.floor(
            new Date().setHours(0, 0, 0, 0) / 1000,
          );
          const needingEntry = diaries.filter(
            (diary) => diary.last_active_date < startOfToday,
          );
          const lastSent = Number(localStorage.getItem(LAST_STREAK_KEY) || 0);

          if (
            needingEntry.length > 0 &&
            now - lastSent >= settings.streakFrequencyHours * 60 * 60 * 1000
          ) {
            const reminder = randomItem(STREAK_NOTICES);
            const sent = await notify(
              reminder.title,
              `${reminder.body} Nhật ký “${needingEntry[0].diary_name}” đang chờ bạn.`,
            );

            if (sent) {
              localStorage.setItem(LAST_STREAK_KEY, String(now));
            }
          }
        }

        if (
          settings.tipsEnabled &&
          localStorage.getItem(LAST_TIP_KEY) !== today
        ) {
          const [hour, minute] = settings.reminderTime.split(":").map(Number);
          const current = new Date();
          const reminderTimeHasPassed =
            current.getHours() > hour ||
            (current.getHours() === hour && current.getMinutes() >= minute);

          if (reminderTimeHasPassed) {
            const tip = randomItem(TIP_NOTICES);
            const sent = await notify(tip.title, tip.body);

            if (sent) {
              localStorage.setItem(LAST_TIP_KEY, today);
            }
          }
        }
      }
    } catch (error) {
      console.debug("Không thể thiết lập lời nhắc", error);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void check();

    const timer = setInterval(() => void check(), 60_000);
    window.addEventListener("rice-diary-settings-changed", check);

    return () => {
      clearInterval(timer);
      window.removeEventListener("rice-diary-settings-changed", check);
    };
  }, [check]);

  return null;
}
