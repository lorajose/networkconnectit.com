import Link from "next/link";
import { LockKeyhole, ShieldCheck, UserRoundCog } from "lucide-react";

import { bootstrapFirstAdminAction } from "@/app/(auth)/bootstrap/first-admin/actions";
import { FirstAdminBootstrapForm } from "@/components/auth/first-admin-bootstrap-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { withAppBasePath } from "@/lib/app-paths";
import {
  getFirstAdminBootstrapAvailability,
  type FirstAdminBootstrapUnavailableReason
} from "@/lib/bootstrap-admin";

export const dynamic = "force-dynamic";

function getUnavailableCopy(
  reason: FirstAdminBootstrapUnavailableReason | null
) {
  switch (reason) {
    case "disabled":
      return {
        title: "Bootstrap is disabled",
        description:
          "Set ENABLE_FIRST_ADMIN_BOOTSTRAP=true and provide a strong FIRST_ADMIN_BOOTSTRAP_TOKEN before using this route."
      };
    case "missing_token":
      return {
        title: "Bootstrap token is missing",
        description:
          "This environment has first-admin bootstrap enabled, but no FIRST_ADMIN_BOOTSTRAP_TOKEN is configured."
      };
    case "weak_token":
      return {
        title: "Bootstrap token is too weak",
        description:
          "Replace FIRST_ADMIN_BOOTSTRAP_TOKEN with a long random value before using the one-time bootstrap route."
      };
    case "already_bootstrapped":
      return {
        title: "Bootstrap is permanently locked",
        description:
          "An internal admin already exists for this database. Sign in with that account or create additional internal users from the app."
      };
    default:
      return {
        title: "Bootstrap is unavailable",
        description:
          "This route is reserved for the first internal admin in a non-demo environment."
      };
  }
}

export default async function FirstAdminBootstrapPage() {
  const availability = await getFirstAdminBootstrapAvailability();
  const unavailableCopy = getUnavailableCopy(availability.unavailableReason);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge variant="outline">One-time bootstrap</Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Provision the first internal admin safely
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Use this route only when a non-demo environment has no internal
              admin account yet. The workflow is environment-gated,
              token-protected, and it closes itself once the first internal
              admin exists.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Environment gated
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The route only activates when the deployment explicitly
                    enables first-admin bootstrap and supplies a strong token.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    One-time safe
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Creation is blocked as soon as a{" "}
                    <span className="font-medium text-foreground">
                      SUPER_ADMIN
                    </span>{" "}
                    or{" "}
                    <span className="font-medium text-foreground">
                      INTERNAL_ADMIN
                    </span>{" "}
                    already exists.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:col-span-2">
              <div className="flex items-start gap-3">
                <UserRoundCog className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    What this creates
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The first account created here is always a{" "}
                    <span className="font-medium text-foreground">
                      SUPER_ADMIN
                    </span>{" "}
                    with a bcrypt-hashed password. After signing in, you can
                    create additional internal users through the standard app
                    flows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {availability.available ? (
          <FirstAdminBootstrapForm action={bootstrapFirstAdminAction} />
        ) : (
          <Card className="border-border/80 bg-card/90">
            <CardHeader className="space-y-3">
              <CardTitle>{unavailableCopy.title}</CardTitle>
              <CardDescription>{unavailableCopy.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                This route stays outside the normal login flow and should only
                be used during first-time environment provisioning.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild>
                  <Link href={withAppBasePath("/login")}>Back to sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
