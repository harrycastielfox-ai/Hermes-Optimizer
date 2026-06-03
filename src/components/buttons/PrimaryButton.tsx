import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>;

const styles: Record<Variant, string> = {
  primary: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25",
  secondary: "border-slate-600 bg-slate-800/70 text-slate-100 hover:bg-slate-700/80",
  danger: "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20",
  ghost: "border-transparent bg-transparent text-slate-300 hover:bg-slate-800/70",
};

export function PrimaryButton({ children, variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
