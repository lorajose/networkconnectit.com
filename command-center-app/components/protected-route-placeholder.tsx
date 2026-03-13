import { CheckCircle2, LockKeyhole } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { AppRole } from "@/lib/rbac";
import { roleLabels } from "@/lib/rbac";

type Highlight = {
  label: string;
  value: string;
  hint: string;
};

type ProtectedRoutePlaceholderProps = {
  section: string;
  title: string;
  description: string;
  userRole: AppRole;
  allowedRoles: readonly AppRole[];
  highlights: Highlight[];
  nextSteps: string[];
};

export function ProtectedRoutePlaceholder({
  section,
  title,
  description,
  userRole,
  allowedRoles,
  highlights,
  nextSteps
}: ProtectedRoutePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={section}
        title={title}
        description={description}
        actions={<Badge>{roleLabels[userRole]}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-3">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              What belongs here next
            </CardTitle>
            <CardDescription>
              This route is protected and ready for future feature delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextSteps.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Access policy
            </CardTitle>
            <CardDescription>
              Middleware protects the route. Server helpers enforce role checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowedRoles.map((role) => (
              <Badge key={role} variant="outline">
                {roleLabels[role]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
