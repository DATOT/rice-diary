"use client";

import { useEffect, useState } from "react";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { loadAppSettings, saveAppSettings, type AppSettings } from "@/app/lib/services/insights";

const THEMES = [
  { id: "system", name: "Theo hệ thống" },
  { id: "light", name: "Sáng" },
  { id: "dark", name: "Tối" },
  { id: "cupcake", name: "Bánh kem" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ theme: "light", streakEnabled: true, streakFrequencyHours: 24, tipsEnabled: false, reminderTime: "09:00" });
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    loadAppSettings().then((value) => {
      if (!alive) return;
      setSettings(value);
      document.documentElement.dataset.theme = value.theme;
      setReady(true);
    }).catch(() => setReady(true));
    return () => { alive = false; };
  }, []);

  async function update(next: AppSettings) {
    setSettings(next);
    document.documentElement.dataset.theme = next.theme;
    try {
      await saveAppSettings(next);
      setMessage("Đã lưu cài đặt.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể lưu cài đặt.");
    }
  }

  async function enableNotifications() {
    try {
      const granted = await isPermissionGranted() || await requestPermission() === "granted";
      setMessage(granted ? "Đã cấp quyền thông báo. Lời nhắc sẽ được thiết lập theo cài đặt." : "Bạn chưa cấp quyền thông báo trong thiết bị.");
      if (granted) window.dispatchEvent(new Event("rice-diary-settings-changed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể yêu cầu quyền thông báo.");
    }
  }

  if (!ready) return <div className="p-8 text-center">Đang tải cài đặt…</div>;
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-5 p-4 pb-28">
    <header><h1 className="text-2xl font-black">Cài đặt</h1><p className="mt-1 text-sm opacity-70">Tùy chỉnh giao diện và lời nhắc chăm sóc cây.</p></header>
    <section className="card gap-3 bg-base-200 p-4">
      <h2 className="text-lg font-bold">Giao diện</h2>
      {THEMES.map((theme) => <label key={theme.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-box bg-base-100 p-3">
        <input className="radio radio-primary" type="radio" name="theme" checked={settings.theme === theme.id} onChange={() => void update({ ...settings, theme: theme.id })} />
        <span>{theme.name}</span>
      </label>)}
    </section>
    <section className="card gap-4 bg-base-200 p-4">
      <div><h2 className="text-lg font-bold">Thông báo</h2><p className="text-sm opacity-70">Trên điện thoại, lời nhắc được lên lịch và vẫn có thể hiển thị khi ứng dụng đóng.</p></div>
      <button className="btn btn-outline min-h-12" onClick={enableNotifications}>Bật quyền thông báo trên thiết bị</button>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-box bg-base-100 p-3">
        <span><b>Nhắc duy trì chuỗi</b><span className="block text-xs opacity-70">Nhắc ghi nhật ký để giữ chuỗi ngày.</span></span>
        <input className="toggle toggle-primary" type="checkbox" checked={settings.streakEnabled} onChange={(event) => void update({ ...settings, streakEnabled: event.target.checked })} />
      </label>
      <label className="form-control gap-2"><span className="font-medium">Tần suất nhắc chuỗi</span>
        <select className="select select-bordered min-h-12 w-full" value={settings.streakFrequencyHours} onChange={(event) => void update({ ...settings, streakFrequencyHours: Number(event.target.value) })}>
          <option value={6}>Mỗi 6 giờ</option><option value={12}>Mỗi 12 giờ</option><option value={24}>Mỗi ngày</option><option value={48}>Mỗi 2 ngày</option><option value={168}>Mỗi tuần</option>
        </select>
      </label>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-box bg-base-100 p-3">
        <span><b>Mẹo chăm sóc ngẫu nhiên</b><span className="block text-xs opacity-70">Ví dụ: “Đừng quên tưới cây nhé!”</span></span>
        <input className="toggle toggle-primary" type="checkbox" checked={settings.tipsEnabled} onChange={(event) => void update({ ...settings, tipsEnabled: event.target.checked })} />
      </label>
      <label className="form-control gap-2"><span className="font-medium">Giờ gửi mẹo chăm sóc</span><input className="input input-bordered min-h-12 w-full" type="time" value={settings.reminderTime} onChange={(event) => void update({ ...settings, reminderTime: event.target.value })} /></label>
    </section>
    {message && <p role="status" className="text-center text-sm opacity-75">{message}</p>}
  </main>;
}
