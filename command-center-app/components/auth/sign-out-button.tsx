"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { withAppBasePath } from "@/lib/app-paths";

export function SignOutButton() {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => signOut({ callbackUrl: withAppBasePath("/login") })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
