import type { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/rbac";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      organizationId: string | null;
    };
  }

  interface User {
    role: AppRole;
    organizationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    organizationId?: string | null;
  }
}
