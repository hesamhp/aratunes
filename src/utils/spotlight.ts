import type { MouseEvent } from "react";

/** Tracks the cursor inside an element and exposes --mx / --my CSS vars for spotlight effects. */
export function handleSpot(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}
