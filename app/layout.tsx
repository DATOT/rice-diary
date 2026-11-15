import { Suspense } from "react";
import AppNavbar from "./components/AppNavbar";
import NotificationScheduler from "./components/NotificationScheduler";
import "./globals.css";
import { NoteCreationProvider } from "./contexts/NoteCreationContext";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-base-100 text-base-content">
        <NoteCreationProvider>
          <NotificationScheduler />
          <main className="min-h-screen bg-base-100 text-base-content">
            <Suspense fallback={<div className="p-4">Đang tải…</div>}>
              {children}
            </Suspense>
          </main>
          <AppNavbar />
        </NoteCreationProvider>
      </body>
    </html>
  );
}
