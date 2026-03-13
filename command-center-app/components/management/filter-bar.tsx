import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type FilterBarProps = {
  children: ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
