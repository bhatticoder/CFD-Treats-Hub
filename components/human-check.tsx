"use client";

import { useRef, useState } from "react";
import { Check, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Slide-to-verify human check. Touch-smooth: touch-action none stops the page
 *  scrolling while dragging, and completion triggers at 88% so it's easy to hit
 *  on a phone. */
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

  function moveTo(clientX: number) {
    if (done) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const max = maxX();
    const nx = Math.min(Math.max(0, clientX - rect.left - 22), max);
    setX(nx);
    if (max > 0 && nx >= max * 0.88) {
      setDone(true);
      dragging.current = false;
      setX(max);
      onVerified();
    }
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-12 w-full touch-none select-none overflow-hidden rounded-xl border text-sm",
        done ? "border-success bg-success/10" : "border-border bg-bg-muted",
      )}
      onPointerMove={(e) => {
        if (dragging.current) moveTo(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
        if (!done) setX(0);
      }}
      onPointerLeave={() => {
        if (!done) {
          dragging.current = false;
          setX(0);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-text-faint">
        {done ? (
          <span className="font-medium text-success">Verified ✓</span>
        ) : (
          "Slide to verify you're human →"
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
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging.current) moveTo(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
          if (!done) setX(0);
        }}
        onKeyDown={(e) => {
          if (!done && (e.key === "Enter" || e.key === " ")) {
            setDone(true);
            setX(maxX());
            onVerified();
          }
        }}
        style={{ transform: `translateX(${x}px)`, touchAction: "none" }}
        className={cn(
          "absolute top-1 left-1 grid h-10 w-10 cursor-grab touch-none place-items-center rounded-lg text-white shadow active:cursor-grabbing",
          done ? "bg-success" : "bg-primary",
        )}
      >
        {done ? <Check className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
      </div>
    </div>
  );
}
