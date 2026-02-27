import type { Metadata } from "next";
import "./globals.css";
import { AppShellProvider } from "@/lib/app-shell";

export const metadata: Metadata = {
  title: "Ghana Prisons Learning Portal",
  description: "Offline-first LMS prototype for inmate education and institutional management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShellProvider>{children}</AppShellProvider>
      </body>
    </html>
  );
}
