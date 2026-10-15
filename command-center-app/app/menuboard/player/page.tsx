import type { Metadata } from "next";

import { MenuBoardWebPlayer } from "@/components/menuboard/web-player";

export const metadata: Metadata = {
  title: "NetworkConnectIT MenuBoard Player",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

export default function MenuBoardPlayerPage() {
  return <MenuBoardWebPlayer />;
}
