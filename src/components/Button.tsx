import type { ButtonHTMLAttributes } from "react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-navy text-white shadow-sm hover:bg-navy-light",
    secondary: "border border-coral-border bg-white text-slate-700 hover:bg-brand",
    ghost: "text-slate-600 hover:bg-brand",
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#fddfe0] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
