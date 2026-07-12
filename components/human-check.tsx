"use client";

import { useRef, useState } from "react";
import { Check, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Slide-to-verify human check (replaces the Flutter SliderCaptcha). */
export function HumanCheck({ onVerified }: { onVerified: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const dragging = useRef(false);

  function maxX() {
    const track = trackRef.current;
    if (!track) return 0;
    return track.clientWidth - 44; // handle width
  }

  function move(clientX: number) {
    if (done || !dragging.current) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const nx = Math.min(Math.max(0, clientX - rect.left - 22), maxX());
    setX(nx);
    if (nx >= maxX() - 4) {
      setDone(true);
      dragging.current = false;
      setX(maxX());
      onVerified();
    }
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-11 w-full select-none overflow-hidden rounded-xl border text-sm",
        done ? "border-success bg-success/10" : "border-border bg-bg-muted",
      )}
    >
      <div className="absolute inset-0 grid place-items-center text-text-faint">
        {done ? (
          <span className="font-medium text-success">Verified</span>
        ) : (
          "Slide to verify you're human"
        )}
      </div>
      <div
        role="slider"
        aria-label="Slide to verify"
        aria-valuenow={done ? 100 : 0}
        tabIndex={0}
        onPointerDown={(e) => {
          if (done) return;
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerUp={() => {
          dragging.current = false;
          if (!done) setX(0);
        }}
        onKeyDown={(e) => {
          if (!done && (e.key === "Enter" || e.key === " ")) {
            setDone(true);
            setX(maxX());
            onVerified();
          }
        }}
        style={{ transform: `translateX(${x}px)` }}
        className={cn(
          "absolute top-0.5 left-0.5 grid h-10 w-10 cursor-grab place-items-center rounded-lg text-white shadow active:cursor-grabbing",
          done ? "bg-success" : "bg-primary",
        )}
      >
        {done ? <Check className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
      </div>
    </div>
  );
}
