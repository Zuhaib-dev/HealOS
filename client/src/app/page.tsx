export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center animate-fade-in">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Heal<span className="text-primary">OS</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          An Operating System for Healthcare
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
          System ready — setup complete
        </div>
      </div>
    </main>
  );
}
