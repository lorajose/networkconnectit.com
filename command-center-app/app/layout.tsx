import type { ReactNode } from "react";
import type { Metadata } from "next";

import { AuthSessionProvider } from "@/components/providers/session-provider";

import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetworkConnectIT Security Command Center",
  description:
    "Isolated Next.js application foundation for the NetworkConnectIT Security Command Center.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
