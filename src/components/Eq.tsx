export default function Eq({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[3px] ${className}`}>
      <span className="eq-bar h-3 w-[3px] animate-eq-1 bg-neon" />
      <span className="eq-bar h-3.5 w-[3px] animate-eq-2 bg-rose-neon" />
      <span className="eq-bar h-2.5 w-[3px] animate-eq-3 bg-neon-soft" />
    </span>
  );
}
