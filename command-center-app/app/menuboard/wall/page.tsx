import type { Metadata } from "next";

import { MenuBoardWallPlayer } from "@/components/menuboard/wall-player";

export const metadata: Metadata = {
  title: "NetworkConnectIT MenuBoard Wall Player",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function MenuBoardWallPlayerPage() {
  return <MenuBoardWallPlayer />;
}
