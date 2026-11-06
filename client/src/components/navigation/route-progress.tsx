"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "healos:route-start";

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
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [active, setActive] = useState(false);
  const [veil, setVeil] = useState(false);
  const [scale, setScale] = useState(0);
  const timers = useRef<number[]>([]);
  const activeRef = useRef(false);
  const startRef = useRef<(anchor?: HTMLAnchorElement) => void>(() => {});

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const finish = () => {
    if (!activeRef.current) return;
    clearTimers();
    setScale(1);
    setVeil(false);
    document.documentElement.removeAttribute("data-route-loading");
    document.querySelectorAll("[data-route-pending]").forEach((el) => {
      el.removeAttribute("data-route-pending");
      el.removeAttribute("aria-busy");
    });
    timers.current.push(
      window.setTimeout(() => {
        activeRef.current = false;
        setActive(false);
        setScale(0);
      }, 220),
    );
  };

  const start = (anchor?: HTMLAnchorElement) => {
    clearTimers();
    activeRef.current = true;
    setActive(true);
    setScale(0.08);
    document.documentElement.setAttribute("data-route-loading", "true");
    if (anchor) {
      anchor.setAttribute("data-route-pending", "true");
      anchor.setAttribute("aria-busy", "true");
    }
    timers.current.push(window.setTimeout(finish, 12000));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScale(1);
      setVeil(false);
      return;
    }

    const trickle = () => {
      setScale((s) => (s >= 0.9 ? s : s + (0.9 - s) * 0.07));
      timers.current.push(window.setTimeout(trickle, 280));
    };
    timers.current.push(window.setTimeout(trickle, 90));
    timers.current.push(window.setTimeout(() => setVeil(true), 140));
  };

  const finishRef = useRef(finish);
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
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (sameDestination(url)) return;
      startRef.current(anchor);
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

  if (!active && scale === 0) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(scale * 100)}
        aria-label="Loading page"
      >
        <div
          className="h-full origin-left bg-accent shadow-[0_0_18px_color-mix(in_oklab,var(--color-accent)_80%,transparent)]"
          style={{
            transform: `scaleX(${scale})`,
            transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <div
        aria-hidden={!veil}
        data-route-progress-veil=""
        className={`pointer-events-none fixed inset-0 z-[45] bg-background/25 backdrop-blur-[1px] transition-opacity duration-200 ${
          veil ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className="sr-only" aria-live="polite">
        {active ? "Loading page" : "Page loaded"}
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
