"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full p-8 rounded-3xl border border-border/80 bg-card/60 shadow-xl backdrop-blur-sm text-center space-y-6">
        <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
          <AlertCircle className="size-8" />
        </div>

        <div className="space-y-2">
          <span className="mono-label text-xs uppercase tracking-wider text-destructive font-semibold">
            Application Error
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred while rendering this view. You can attempt to restore the session or return to safety.
          </p>
          {error.digest && (
            <p className="mono-label text-[11px] text-muted-foreground/70 pt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 mono-label text-xs font-semibold"
          >
            <RotateCcw data-icon="inline-start" className="size-3.5" />
            Try again
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex items-center justify-center gap-2 mono-label text-xs font-semibold"
          >
            <Link href="/">
              <Home data-icon="inline-start" className="size-3.5" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
