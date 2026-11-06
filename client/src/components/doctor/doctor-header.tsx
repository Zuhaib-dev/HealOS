import type { ReactNode } from "react";

export function DoctorHeader({
  title,
  note,
  actions,
}: {
  title: string;
  note: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{note}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
