import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Coach — prep, practice, and gentle real-time support",
  description:
    "A warm, private space to prepare for interviews — resume-aware question lists, practice interviews with personalized feedback, and live prompts when you need them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
