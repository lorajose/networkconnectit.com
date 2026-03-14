import { SignInForm } from "@/components/auth/sign-in-form";
import { Badge } from "@/components/ui/badge";
import { withAppBasePath } from "@/lib/app-paths";

type LoginPageProps = {
  searchParams?: {
    bootstrap?: string;
    callbackUrl?: string;
    email?: string;
    error?: string;
  };
};

function getErrorMessage(error?: string) {
  if (!error) {
    return "";
  }

  if (error === "CredentialsSignin") {
    return "Sign in failed. Check the email and password for the account.";
  }

  return "Authentication could not be completed.";
}

function getNoticeMessage(bootstrap?: string, email?: string) {
  if (bootstrap !== "success") {
    return "";
  }

  if (email) {
    return `First internal admin created for ${email}. Sign in with the new account to finish setup.`;
  }

  return "First internal admin created successfully. Sign in to finish setup.";
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = searchParams?.callbackUrl || withAppBasePath("/dashboard");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/70 p-6 shadow-[0_24px_80px_rgba(8,15,31,0.22)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_32%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute left-10 top-10 h-2 w-2 animate-pulse rounded-full bg-sky-300/90" />
              <div className="absolute left-12 top-11 h-px w-28 bg-gradient-to-r from-sky-300/70 to-transparent" />
              <div className="absolute left-40 top-24 h-2 w-2 animate-pulse rounded-full bg-cyan-200/90 [animation-delay:300ms]" />
              <div className="absolute left-42 top-25 h-px w-24 bg-gradient-to-r from-cyan-200/60 to-transparent" />
              <div className="absolute right-20 top-20 h-2 w-2 animate-pulse rounded-full bg-sky-400/80 [animation-delay:700ms]" />
              <div className="absolute bottom-16 right-24 h-2 w-2 animate-pulse rounded-full bg-emerald-300/80 [animation-delay:900ms]" />
              <div className="absolute bottom-14 right-24 h-px w-20 bg-gradient-to-l from-emerald-300/50 to-transparent" />
            </div>

            <div className="relative space-y-6">
              <Badge variant="outline">Client Operations Portal</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  NetworkConnectIT Security Command Center
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Centralized monitoring and management for your security and
                  network infrastructure.
                </p>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Our Command Center gives your team one place to review
                  cameras, network equipment, site health, operational alerts,
                  project documentation, and deployment records. From day-to-day
                  visibility to long-term infrastructure oversight,
                  NetworkConnectIT helps keep your systems secure, reliable,
                  and running with confidence.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Real-time infrastructure visibility
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Monitor cameras, network devices, and site conditions from
                    one operational view.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Alerts and system health
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Track active issues, offline equipment, and monitoring
                    status before they become bigger problems.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Project and installation tracking
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Access commissioning records, site documentation, and
                    delivery details for every installation.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Topology and device mapping
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Understand how routers, switches, NVRs, cameras, and access
                    points are connected across your environment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-sm font-medium text-foreground">
                Designed for distributed operations
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ideal for multi-site businesses, property managers, retail
                chains, security teams, and facility operations.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-sm font-medium text-foreground">
                Secure operational access
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Give approved stakeholders a controlled way to review system
                status, documentation, and active issues.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-sm font-medium text-foreground">
                Built for long-term service
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Support handoff, maintenance, expansion planning, and
                day-to-day operational insight through one platform.
              </p>
            </div>
          </div>
        </div>

        <SignInForm
          callbackUrl={callbackUrl}
          errorMessage={getErrorMessage(searchParams?.error)}
          initialEmail={searchParams?.email}
          noticeMessage={getNoticeMessage(
            searchParams?.bootstrap,
            searchParams?.email
          )}
        />
      </div>
    </main>
  );
}
