import { Suspense } from "react";
import AppNavbar from "./components/AppNavbar";
import "./globals.css";
import { NoteCreationProvider } from "./contexts/NoteCreationContext";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={"h-full antialiased"}>
      <body className="min-h-full flex flex-col">
        <NoteCreationProvider>
          <main className="min-h-screen">
            <Suspense fallback={<div>Đang tải...</div>}>{children}</Suspense>
          </main>
          <AppNavbar />
        </NoteCreationProvider>
      </body>
    </html>
  );
}
