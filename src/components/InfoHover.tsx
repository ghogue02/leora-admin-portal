type InfoHoverProps = {
  text: string;
  label?: string;
  align?: "center" | "left" | "right";
};

export function InfoHover({ text, label, align = "center" }: InfoHoverProps) {
  const alignmentClass =
    align === "left"
      ? "left-0 -translate-x-1/4"
      : align === "right"
        ? "right-0 translate-x-1/4"
        : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="peer inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        aria-label={label ?? "Show calculation details"}
      >
        ?
      </button>
      <span
        className={`pointer-events-none absolute top-full z-20 mt-2 hidden w-64 rounded-md bg-slate-900 px-3 py-2 text-left text-xs text-white shadow-lg whitespace-pre-line ${alignmentClass} peer-hover:block peer-focus-visible:block`}
      >
        {text}
      </span>
    </span>
  );
}
