import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withAppBasePath } from "@/lib/app-paths";

import { requestPasswordResetAction } from "./actions";

type ForgotPasswordPageProps = {
  searchParams?: { sent?: string };
};

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const sent = searchParams?.sent === "1";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your account email. If an eligible account exists, we will send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {sent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              If an eligible account exists, password reset instructions have been sent.
            </div>
          ) : null}
          <form action={requestPasswordResetAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <Button className="w-full" type="submit">Send reset instructions</Button>
          </form>
          <Link className="block text-center text-sm text-primary hover:underline" href={withAppBasePath("/login")}>
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
