"use client";

import { useState } from "react";

export function AnatomySelector({
  onSelect,
}: {
  onSelect: (part: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const parts = [
    { id: "Head", d: "M 100 15 A 25 25 0 1 0 100 65 A 25 25 0 1 0 100 15 Z" },
    { id: "Neck", d: "M 90 65 L 110 65 L 115 80 L 85 80 Z" },
    { id: "Chest", d: "M 70 80 L 130 80 L 120 150 L 80 150 Z" },
    { id: "Abdomen", d: "M 80 155 L 120 155 L 110 210 L 90 210 Z" },
    { id: "Left Arm", d: "M 65 80 Q 40 130 30 200 L 45 200 Q 55 130 75 85 Z" },
    {
      id: "Right Arm",
      d: "M 135 80 Q 160 130 170 200 L 155 200 Q 145 130 125 85 Z",
    },
    {
      id: "Left Leg",
      d: "M 90 215 Q 70 280 75 380 L 95 380 Q 85 280 100 215 Z",
    },
    {
      id: "Right Leg",
      d: "M 110 215 Q 130 280 125 380 L 105 380 Q 115 280 100 215 Z",
    },
  ];

  return (
    <div className="flex w-full flex-col items-center border border-border/60 bg-background p-3">
      <p className="mono-label self-start text-[10px] text-muted-foreground">
        Tap a region to tag
      </p>
      <svg viewBox="0 0 200 400" className="mt-2 h-auto w-full max-w-36">
        {parts.map((p) => {
          const isHovered = hovered === p.id;
          return (
            <path
              key={p.id}
              d={p.d}
              stroke="currentColor"
              strokeOpacity={isHovered ? 1 : 0.45}
              strokeWidth={isHovered ? 2.5 : 1.5}
              fill="currentColor"
              fillOpacity={isHovered ? 0.18 : 0}
              className="cursor-pointer text-primary"
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(p.id)}
            />
          );
        })}
      </svg>
      <p className="mt-2 min-h-4 text-center font-mono text-[10px] text-muted-foreground">
        {hovered ?? " "}
      </p>
    </div>
  );
}
