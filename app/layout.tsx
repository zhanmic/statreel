import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StatReel",
  description: "Animate rankings and comparisons, then export a short video with BGM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
