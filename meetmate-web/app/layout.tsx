import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "meetmate",
  description: "Meet new people with meetmate"
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
  </html>
);

export default RootLayout;
