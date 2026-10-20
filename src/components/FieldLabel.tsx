import type { ReactNode } from "react";

export default function FieldLabel({ children, arabic }: { children: ReactNode; arabic?: string }) {
  return (
    <span className="mb-2 block text-xs font-bold text-slate-600">
      {children} {arabic && <span className="font-medium text-slate-400" dir="rtl">· {arabic}</span>}
    </span>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 outline-none transition focus:border-navy focus:ring-4 focus:ring-[#fddfe0] md:text-sm";
