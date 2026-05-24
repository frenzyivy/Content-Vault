import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Content Vault",
  description: "Personal content command center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#1a1714" }}>{children}</body>
    </html>
  );
}
