"use client";

import { useEffect, useState } from "react";
const THEMES = [
  { id: "system", name: "Hệ thống"},
  { id: "light", name: "Sáng"},
  { id: "dark", name: "Tối"},
  { id: "cupcake", name: "Bánh kem"},
];
export default function SettingsPage() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem("rice-diary-theme") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  function chooseTheme(value: string) {
    setTheme(value);
    localStorage.setItem("rice-diary-theme", value);
    document.documentElement.dataset.theme = value;
  }
  return <main className="max-w-2xl mx-auto p-4 pb-24">
    <h1 className="text-2xl font-black mb-2">Cài đặt</h1>
    <p className="opacity-70 mb-6">Tùy chỉnh giao diện ứng dụng.</p>
    <section className="card bg-base-200 p-5 gap-4">
      <h2 className="text-lg font-bold">Giao diện</h2>
      {THEMES.map((item) => <label key={item.id} className="flex items-center gap-3 p-3 rounded-box bg-base-100 cursor-pointer">
        <input className="radio radio-primary" type="radio" name="theme" value={item.id} checked={theme === item.id} onChange={() => chooseTheme(item.id)} />
        <span><span className="font-semibold block">{item.name}</span></span>
      </label>)}
    </section>
  </main>;
}
