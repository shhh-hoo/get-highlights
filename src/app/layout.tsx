import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Get Highlights — CV Studio",
  description: "JD-aware resume composer with locked facts and live A4 preview.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
