export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-[#0b2854] shadow-[0_8px_18px_-10px_rgba(11,40,84,.9)]">
        <span className="font-display text-xl italic leading-none text-white">S</span>
        <span className="absolute bottom-0 left-0 h-[3px] w-full bg-[#73d0bd]" />
      </div>
      {!compact && <span className="text-[1.02rem] font-extrabold tracking-[-.04em] text-[#112b51]">Job Sarthi</span>}
    </div>
  );
}
