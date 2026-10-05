import { useEffect, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import Links from "./components/Links";
import Player from "./components/Player";
import Footer from "./components/Footer";
import CursorGlow from "./components/CursorGlow";
import LiveMark from "./components/LiveMark";
import { engine } from "./audio/engine";

export default function App() {
  const state = useSyncExternalStore(engine.subscribe, engine.getState);

  useEffect(() => {
    engine.onEnded = () => engine.stop();
    return () => {
      engine.onEnded = null;
    };
  }, []);

  return (
    <div className="grain relative min-h-screen overflow-x-clip bg-ink text-white">
      {/* ambient atmosphere */}
      <div className="pointer-events-none fixed inset-x-0 -top-52 mx-auto h-[28rem] w-[48rem] max-w-none rounded-full bg-neon/15 blur-[170px]" />
      <div className="pointer-events-none fixed -left-44 top-1/3 h-[26rem] w-[26rem] animate-float rounded-full bg-neon/12 blur-[150px]" />
      <div className="pointer-events-none fixed -right-48 bottom-0 h-[26rem] w-[26rem] animate-float-late rounded-full bg-rose-neon/10 blur-[160px]" />
      <CursorGlow />

      <header className="relative flex flex-col items-center gap-5 pb-7 pt-16 md:pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <LiveMark />
        </motion.div>
        <motion.h1
          dir="ltr"
          initial={{ opacity: 0, y: 20, letterSpacing: "1em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.38em" }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="shimmer-text font-display text-2xl font-bold sm:text-3xl md:text-4xl"
          style={{ paddingLeft: "0.38em" }}
        >
          ARATUNES
        </motion.h1>
      </header>

      <main className="relative">
        <Links />
        <Player state={state} />
      </main>
      <Footer />
    </div>
  );
}
