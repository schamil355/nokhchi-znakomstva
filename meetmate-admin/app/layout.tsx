import "./globals.css";
import React from "react";
import { assertAdminOrThrow } from "@/app/api/admin/audit";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await assertAdminOrThrow();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
