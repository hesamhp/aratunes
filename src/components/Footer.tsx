import { links } from "../data";
import { brandIcons } from "./icons";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-neon/60 to-transparent md:inset-x-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-neon/[0.06] to-transparent" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 pb-12 pt-10">
        <div className="flex items-center gap-2.5">
          {links.map((l) => {
            const Icon = brandIcons[l.id];
            return (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                aria-label={l.handle}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-white/30"
                style={{ color: l.color }}
              >
                <Icon className="h-4.5 w-4.5" />
              </a>
            );
          })}
        </div>
        <span
          dir="ltr"
          className="font-display text-[10px] tracking-[0.25em] text-white/35"
        >
          2026 — DESIGN BY{" "}
          <a
            href="https://instagram.com/hesvmhsp"
            target="_blank"
            rel="noreferrer"
            className="shimmer-text font-bold transition-opacity hover:opacity-75"
          >
            HESVM
          </a>
        </span>
      </div>
    </footer>
  );
}
