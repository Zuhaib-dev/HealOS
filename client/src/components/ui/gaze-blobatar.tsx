"use client";

import { useEffect, useRef } from "react";
import { Blobatar, BlobatarProps } from "@blobatar/react";
import { gaze } from "blobatar/gaze";
import "blobatar/motion.css";
import "blobatar/gaze.css";

export function GazeBlobatar(props: BlobatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find the svg inside the container
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    // We must set the travel distance for the eyes to move
    svg.style.setProperty("--mo-track-travel", "12px");

    // Initialize the gaze driver to follow the pointer
    const driver = gaze(svg, { target: "pointer" });
    
    return () => {
      driver.stop();
    };
  }, []);

  // We enforce animate="always" because only SVGs (animated) can move eyes
  return (
    <div ref={containerRef} className="size-full flex items-center justify-center">
      <Blobatar {...(props as any)} animate="always" />
    </div>
  );
}
