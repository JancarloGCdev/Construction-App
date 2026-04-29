import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  backHref?: string;
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ title, backHref, children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-dvh max-w-2xl mx-auto px-4 pt-1 pb-10 flex flex-col gap-4",
        className
      )}
    >
      <header className="flex items-start gap-3 pt-2 pb-3 border-b border-border/60">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground/90 shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
        </div>
      </header>
      {children}
    </div>
  );
}
