import { motion } from "framer-motion";
import { ArrowUpLeft, Star } from "lucide-react";
import { links, type PlatformLink } from "../data";
import { brandIcons } from "./icons";
import { handleSpot } from "../utils/spotlight";

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Desktop card */
function Card({ l, i }: { l: PlatformLink; i: number }) {
  const Icon = brandIcons[l.id];
  return (
    <motion.a
      href={l.url}
      target="_blank"
      rel="noreferrer"
      onMouseMove={handleSpot}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
      whileHover={{ y: -7 }}
      className={`group spotlight relative flex flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 md:p-7 ${
        l.featured
          ? "grad-border"
          : "border border-white/10 bg-panel hover:border-white/25"
      }`}
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.05] to-transparent" />
      {/* brand glow */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full opacity-0 blur-[80px] transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: l.color }}
      />

      <div className="flex items-start justify-between">
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl border shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{
            background: hexToRgba(l.color, 0.12),
            borderColor: hexToRgba(l.color, 0.3),
            color: l.color,
          }}
        >
          <Icon className="h-7 w-7" />
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-[-2px] group-hover:border-transparent group-hover:bg-white group-hover:text-ink">
          <ArrowUpLeft size={16} />
        </span>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <h3 className="text-xl font-extrabold">{l.handle}</h3>
        {l.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
            <Star size={10} className="fill-gold" />
            فعال
          </span>
        )}
      </div>
      <span
        dir="ltr"
        className="mt-1 text-left font-display text-[10px] tracking-[0.25em] text-white/30"
      >
        {l.name.toUpperCase()}
      </span>

      <p className="mt-4 flex-1 text-sm leading-7 text-fog">{l.desc}</p>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="flex items-baseline gap-2">
          <b dir="ltr" className="font-display text-sm">
            {l.followers}
          </b>
          <span className="text-xs text-white/40">دنبال‌کننده</span>
        </span>
      </div>
    </motion.a>
  );
}

/** Mobile row button */
function RowButton({ l, i }: { l: PlatformLink; i: number }) {
  const Icon = brandIcons[l.id];
  return (
    <motion.a
      href={l.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
      style={{ boxShadow: `inset -2.5px 0 0 0 ${hexToRgba(l.color, 0.7)}` }}
      className="group flex items-center gap-3.5 overflow-hidden rounded-2xl border border-white/10 bg-panel px-3.5 py-3 transition-all duration-200 active:scale-[0.98] active:border-white/25"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-inner"
        style={{
          background: hexToRgba(l.color, 0.12),
          borderColor: hexToRgba(l.color, 0.28),
          color: l.color,
        }}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold">
          {l.handle}
        </span>
        <span
          dir="ltr"
          className="mt-0.5 block text-left font-display text-[9px] tracking-[0.22em] text-white/30"
        >
          {l.name.toUpperCase()}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-3">
        <b dir="ltr" className="font-display text-xs text-white/50">
          {l.followers}
        </b>
        <ArrowUpLeft
          size={16}
          className="text-white/35 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </motion.a>
  );
}

export default function Links() {
  return (
    <section id="links" className="relative">
      <div className="mx-auto max-w-6xl px-5">
        {/* mobile: row buttons */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {links.map((l, i) => (
            <RowButton key={l.id} l={l} i={i} />
          ))}
        </div>

        {/* tablet & desktop: cards */}
        <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l, i) => (
            <Card key={l.id} l={l} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
