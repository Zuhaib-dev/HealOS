export function NurseSkeleton() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-40 animate-pulse bg-foreground/8" />
      <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background p-5">
            <div className="h-3 w-16 animate-pulse bg-foreground/8" />
            <div className="mt-3 h-5 w-32 animate-pulse bg-foreground/10" />
            <div className="mt-4 h-16 animate-pulse bg-foreground/6" />
          </div>
        ))}
      </div>
    </section>
  );
}
