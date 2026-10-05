import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { tracks, type Track } from "../data";
import { engine, type EngineState } from "../audio/engine";
import { handleSpot } from "../utils/spotlight";
import Eq from "./Eq";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toSeconds(dur: string) {
  const [m, s] = dur.split(":").map(Number);
  return m * 60 + s;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Drives a glow element's opacity from the real audio level. */
function useAudioGlow(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    let raf = 0;
    let cur = 0;
    const loop = () => {
      const target = engine.getBands().level;
      cur += (target - cur) * 0.1;
      ref.current?.style.setProperty("opacity", (0.14 + cur * 0.55).toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}

const BARS = 56;

function Waveform({
  track,
  progress,
  isPlaying,
}: {
  track: Track;
  progress: number;
  isPlaying: boolean;
}) {
  const bars = useMemo(() => {
    const rnd = mulberry32(track.audio.seed * 31 + 5);
    return Array.from(
      { length: BARS },
      (_, i) =>
        0.2 +
        0.8 * Math.abs(Math.sin(i * 0.9 + rnd() * 4)) * (0.35 + rnd() * 0.65)
    );
  }, [track]);

  return (
    <div dir="ltr" className="flex h-14 items-end gap-[3px] md:h-16">
      {bars.map((h, i) => {
        const filled = (i + 0.5) / bars.length <= progress;
        return (
          <span
            key={i}
            className="flex-1 origin-bottom rounded-full transition-transform duration-300"
            style={{
              height: `${h * 100}%`,
              background: filled
                ? "linear-gradient(to top, #8b5cf6, #ff4d8d)"
                : "rgba(255,255,255,0.13)",
              animation: isPlaying
                ? `eq ${(0.85 + ((i * 7) % 5) * 0.15).toFixed(2)}s ease-in-out ${(
                    i * 0.04
                  ).toFixed(2)}s infinite`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function SideRow({
  t,
  i,
  state,
}: {
  t: Track;
  i: number;
  state: EngineState;
}) {
  const isActive = state.trackId === t.id;
  const isPlaying = isActive && state.playing;

  return (
    <motion.div
      initial={{ opacity: 0, x: 26 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
      onClick={() => (isActive ? engine.toggle(t) : engine.start(t))}
      onMouseMove={handleSpot}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isActive ? engine.toggle(t) : engine.start(t);
        }
      }}
      className={`spotlight group flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 transition-all ${
        isActive
          ? "border-neon/40 bg-neon/[0.08] shadow-[0_18px_50px_-20px_rgba(139,92,246,0.55)]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
      }`}
    >
      <span className="w-6 shrink-0 font-display text-[11px] text-white/25">
        {String(i + 1).padStart(2, "0")}
      </span>

      <div className="relative shrink-0">
        <img
          src={t.cover}
          alt={t.titleFa}
          loading="lazy"
          className={`h-12 w-12 rounded-xl object-cover transition ${
            isActive ? "ring-2 ring-neon/60" : ""
          }`}
        />
        <span
          className={`absolute inset-0 grid place-items-center rounded-xl bg-black/55 transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isPlaying ? (
            <Pause size={15} className="fill-white text-white" />
          ) : (
            <Play size={15} className="mr-0.5 fill-white text-white" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-extrabold md:text-base">
            {t.titleFa}
          </span>
          {isPlaying && <Eq />}
        </div>
        <div className="mt-0.5 text-[11px] text-white/40">
          <span
            dir="ltr"
            className="hidden font-display text-[9px] tracking-wider sm:inline"
          >
            {t.titleEn}
          </span>
        </div>
      </div>

      <span dir="ltr" className="shrink-0 text-xs tabular-nums text-white/40">
        {t.duration}
      </span>
    </motion.div>
  );
}

export default function Player({ state }: { state: EngineState }) {
  const main = state.track ?? tracks[0];
  const isCurrent = state.trackId === main.id;
  const isPlaying = isCurrent && state.playing;
  const [elapsed, setElapsed] = useState(0);
  const glowRef = useRef<HTMLDivElement>(null);
  useAudioGlow(glowRef);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setElapsed(engine.getElapsed());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isFileMode = state.mode === "file";
  const durSec = engine.getDuration();
  const progress = isCurrent && durSec > 0 ? Math.min(1, elapsed / durSec) : 0;

  const jump = (dir: 1 | -1) => {
    const i = tracks.findIndex((t) => t.id === main.id);
    engine.start(tracks[(i + dir + tracks.length) % tracks.length]);
  };

  const mappedTime = isCurrent
    ? isFileMode
      ? elapsed
      : Math.min(
          toSeconds(main.duration),
          (elapsed / (state.track?.previewSec ?? 1)) * toSeconds(main.duration)
        )
    : 0;

  const durationLabel = isFileMode && durSec > 0 ? fmt(durSec) : main.duration;

  return (
    <section id="player" className="relative py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]">
          {/* ---- main track card ---- */}
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onMouseMove={handleSpot}
            className="spotlight grad-border relative overflow-hidden rounded-[2rem]"
          >
            {/* ambient blurred cover bg */}
            <AnimatePresence initial={false}>
              <motion.img
                key={main.cover}
                src={main.cover}
                alt=""
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.28 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover blur-[70px] saturate-150"
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/40 via-panel/60 to-ink/80" />
            {/* audio-reactive glow */}
            <div
              ref={glowRef}
              className="pointer-events-none absolute -bottom-28 -left-28 h-[22rem] w-[22rem] rounded-full bg-neon/50 blur-[110px]"
              style={{ opacity: 0.14 }}
            />

            <div className="relative flex flex-col gap-7 p-6 md:p-9">
              {/* cover + info */}
              <div className="flex flex-col items-center gap-7 text-center sm:flex-row sm:items-center sm:text-right">
                <div className="relative shrink-0">
                  {/* rotating ring while playing */}
                  <div
                    className={`grad-ring pointer-events-none absolute -inset-[3px] rounded-[1.15rem] transition-opacity duration-500 ${
                      isPlaying ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={main.cover}
                      src={main.cover}
                      alt={main.titleFa}
                      initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.94, rotate: 2 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className={`relative h-44 w-44 cursor-pointer rounded-2xl border border-white/15 object-cover shadow-2xl shadow-black/60 md:h-56 md:w-56 ${
                        isPlaying ? "ring-2 ring-neon/40" : ""
                      }`}
                      onClick={() =>
                        isCurrent ? engine.toggle(main) : engine.start(main)
                      }
                    />
                  </AnimatePresence>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60">
                      <Headphones size={12} />
                      <span dir="ltr">{main.plays}</span>
                    </span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h3
                      key={main.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35 }}
                      className="mt-4 text-5xl font-black leading-tight md:text-6xl"
                    >
                      {main.titleFa}
                    </motion.h3>
                  </AnimatePresence>
                  <div
                    dir="ltr"
                    className="mt-2 font-display text-[11px] tracking-[0.35em] text-white/30"
                  >
                    {main.titleEn}
                  </div>
                </div>
              </div>

              {/* waveform (click to seek in file mode) */}
              <div
                onClick={(e) => {
                  if (!isFileMode) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  engine.seek((e.clientX - r.left) / r.width);
                }}
                className={isFileMode ? "cursor-pointer" : ""}
                title={isFileMode ? "جلو/عقب بردن آهنگ" : undefined}
              >
                <Waveform track={main} progress={progress} isPlaying={isPlaying} />
                <div
                  dir="ltr"
                  className="mt-2 flex justify-between text-[11px] tabular-nums text-white/40"
                >
                  <span>{fmt(mappedTime)}</span>
                  <span>{durationLabel}</span>
                </div>
              </div>

              {/* controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => jump(-1)}
                  aria-label="ترک قبلی"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <SkipForward size={18} className="fill-current" />
                </button>
                <span className="relative">
                  {isPlaying && (
                    <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-full bg-gradient-to-l from-neon to-rose-neon" />
                  )}
                  <button
                    onClick={() =>
                      isCurrent ? engine.toggle(main) : engine.start(main)
                    }
                    aria-label={isPlaying ? "توقف" : "پخش"}
                    className="relative grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full bg-gradient-to-l from-neon to-rose-neon shadow-xl shadow-neon/50 transition-transform hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause size={26} className="fill-white" />
                    ) : (
                      <Play size={26} className="mr-1 fill-white" />
                    )}
                  </button>
                </span>
                <button
                  onClick={() => jump(1)}
                  aria-label="ترک بعدی"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <SkipBack size={18} className="fill-current" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* ---- side track list ---- */}
          <div className="flex flex-col gap-2.5">
            {tracks.map((t, i) => (
              <SideRow key={t.id} t={t} i={i} state={state} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
