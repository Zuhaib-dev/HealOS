export function ReceptionSkeleton() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-48 animate-pulse bg-foreground/8" />
      <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background p-4 sm:p-5">
            <div className="h-3 w-20 animate-pulse bg-foreground/8" />
            <div className="mt-3 h-8 w-16 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-3 w-28 animate-pulse bg-foreground/6" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex-1 animate-pulse bg-foreground/4" />
    </section>
  );
}
