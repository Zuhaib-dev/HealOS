"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "healos:route-start";
/** Fast hops finish inside this window — no paint, no layout work. */
const SHOW_AFTER_MS = 280;
const HIDE_AFTER_MS = 160;
const FAILSAFE_MS = 12000;

export function startRouteProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(START_EVENT));
}

function sameDestination(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

function RouteProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const [token, setToken] = useState(0);
  const pendingRef = useRef(false);
  const shownRef = useRef(false);
  const timers = useRef<number[]>([]);
  const startRef = useRef<() => void>(() => {});
  const finishRef = useRef<() => void>(() => {});

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const reveal = () => {
    if (!pendingRef.current || shownRef.current) return;
    shownRef.current = true;
    setToken((n) => n + 1);
    setPhase("run");
  };

  const finish = () => {
    if (!pendingRef.current && !shownRef.current) return;
    pendingRef.current = false;
    clearTimers();
    if (!shownRef.current) {
      setPhase("idle");
      return;
    }
    setPhase("done");
    timers.current.push(
      window.setTimeout(() => {
        shownRef.current = false;
        setPhase("idle");
      }, HIDE_AFTER_MS),
    );
  };

  const start = () => {
    clearTimers();
    pendingRef.current = true;
    if (shownRef.current) {
      setToken((n) => n + 1);
      setPhase("run");
    }
    timers.current.push(window.setTimeout(reveal, SHOW_AFTER_MS));
    timers.current.push(window.setTimeout(finish, FAILSAFE_MS));
  };

  useEffect(() => {
    startRef.current = start;
    finishRef.current = finish;
  });

  useEffect(() => {
    const onStart = () => startRef.current();
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (sameDestination(url)) return;
      startRef.current();
    };

    window.addEventListener(START_EVENT, onStart);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(START_EVENT, onStart);
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    finishRef.current();
  }, [pathname, search]);

  if (phase === "idle") return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading page"
      >
        <div
          key={token}
          data-complete={phase === "done" ? "" : undefined}
          className="healos-route-bar h-full origin-left bg-accent"
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {phase === "run" ? "Loading page" : "Page loaded"}
      </span>
    </>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  );
}
