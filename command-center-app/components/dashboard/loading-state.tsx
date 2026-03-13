import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function LoadingState({
  title,
  description,
  className
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col justify-center gap-4 rounded-3xl border border-border/80 bg-background/40 p-6",
        className
      )}
    >
      <div className="h-3 w-24 animate-pulse rounded-full bg-primary/30" />
      <div className="space-y-2">
        <div className="h-6 w-52 animate-pulse rounded-full bg-slate-200/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-200/10" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-200/10" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-200/10" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-200/10" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {title}: {description}
      </p>
    </div>
  );
}
