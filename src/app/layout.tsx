import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { AppShellProvider } from "@/lib/app-shell";

export const metadata: Metadata = {
  title: "Ghana Prisons Learning Portal",
  description: "Offline-first LMS prototype for inmate education and institutional management.",
};

const headingFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AppShellProvider>{children}</AppShellProvider>
      </body>
    </html>
  );
}
