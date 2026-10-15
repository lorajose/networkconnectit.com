import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withAppBasePath } from "@/lib/app-paths";

import { completePasswordResetAction } from "./actions";

type ResetPasswordPageProps = {
  searchParams?: { token?: string; error?: string };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = searchParams?.token ?? "";
  const error = searchParams?.error;
  const message =
    error === "mismatch"
      ? "Passwords do not match."
      : error
        ? "This reset link is invalid or expired."
        : "";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Use at least 12 characters. Completing the reset signs out older sessions for this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {message ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</div> : null}
          {token ? (
            <form action={completePasswordResetAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
              </div>
              <Button className="w-full" type="submit">Reset password</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Request a new password reset link to continue.</p>
          )}
          <Link className="block text-center text-sm text-primary hover:underline" href={withAppBasePath("/forgot-password")}>
            Request another reset link
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
