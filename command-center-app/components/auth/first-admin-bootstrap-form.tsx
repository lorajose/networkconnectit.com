"use client";

import { ShieldPlus, TriangleAlert } from "lucide-react";
import { useFormState } from "react-dom";

import { FieldError } from "@/components/management/field-error";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialManagementFormState,
  type ManagementFormState
} from "@/lib/management/form-state";

type FirstAdminBootstrapFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
};

export function FirstAdminBootstrapForm({
  action
}: FirstAdminBootstrapFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <Card className="border-border/80 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldPlus className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <CardTitle>Create the first internal admin</CardTitle>
          <CardDescription>
            This one-time bootstrap creates the initial{" "}
            <span className="font-medium text-foreground">SUPER_ADMIN</span> for
            a non-demo environment.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <FormMessage state={state} />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="NetworkConnectIT Admin"
              />
              <FieldError errors={state.fieldErrors?.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ops@networkconnectit.com"
              />
              <FieldError errors={state.fieldErrors?.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
              />
              <FieldError errors={state.fieldErrors?.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter the password"
              />
              <FieldError errors={state.fieldErrors?.confirmPassword} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bootstrapToken">Bootstrap token</Label>
            <Input
              id="bootstrapToken"
              name="bootstrapToken"
              type="password"
              autoComplete="one-time-code"
              placeholder="Enter the environment bootstrap token"
            />
            <FieldError errors={state.fieldErrors?.bootstrapToken} />
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Use this route only for the first real internal admin. It
                automatically locks as soon as an internal admin exists, and
                the environment flag should be disabled immediately afterward.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton label="Create first admin" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
