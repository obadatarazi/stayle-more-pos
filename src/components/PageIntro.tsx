import type { ReactNode } from "react";

export default function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:mb-7 md:gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold text-navy md:text-sm">{eyebrow}</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
        <p className="mt-1.5 hidden max-w-2xl text-sm leading-6 text-slate-500 md:mt-2 md:block">{description}</p>
      </div>
      {action && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{action}</div>}
    </div>
  );
}
