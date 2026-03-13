import { SignInForm } from "@/components/auth/sign-in-form";
import { Badge } from "@/components/ui/badge";
import { withAppBasePath } from "@/lib/app-paths";

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string;
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

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = searchParams?.callbackUrl || withAppBasePath("/dashboard");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge variant="outline">Authentication</Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Secure access for operational teams
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              The first release of the isolated Command Center uses
              credential-based sign-in with role-aware routing so the app can
              evolve safely before CRUD features are introduced.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-sm font-medium text-foreground">
                Demo environment ready
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the seeded admin or viewer accounts to validate login and tenant-safe routing.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-sm font-medium text-foreground">
                Static-site chrome retained
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The login entry now carries the main NetworkConnectIT navigation and footer while keeping app auth isolated.
              </p>
            </div>
          </div>
        </div>

        <SignInForm
          callbackUrl={callbackUrl}
          errorMessage={getErrorMessage(searchParams?.error)}
        />
      </div>
    </main>
  );
}
