import { useEffect, useRef } from "react";
import { engine } from "../audio/engine";

const OFFSETS = [0, 0.9, 1.7, 0.5, 1.3];

/** A tiny brand mark of 5 bars that breathes idly and dances with the real audio level. */
export default function LiveMark() {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const { level } = engine.getBands();
      const time = t / 1000;
      for (let i = 0; i < OFFSETS.length; i++) {
        const el = bars.current[i];
        if (!el) continue;
        const idle =
          (Math.sin(time * 2.1 + OFFSETS[i]) * 0.5 + 0.5) * 0.28 + 0.14;
        const target =
          level > 0.02
            ? Math.min(1, 0.25 + level * (0.55 + i * 0.13))
            : idle;
        el.style.transform = `scaleY(${target.toFixed(3)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span dir="ltr" className="flex h-8 items-end gap-[5px]">
      {OFFSETS.map((o, i) => (
        <span
          key={o}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="h-full w-[5px] origin-bottom rounded-full bg-gradient-to-t from-neon to-rose-neon"
          style={{
            transform: "scaleY(0.2)",
            boxShadow: "0 0 14px rgba(139,92,246,.5)",
          }}
        />
      ))}
    </span>
  );
}
