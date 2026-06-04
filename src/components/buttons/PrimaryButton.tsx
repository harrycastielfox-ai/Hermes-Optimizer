import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>;

const styles: Record<Variant, string> = {
  primary: "border-amber-400 bg-gradient-to-r from-amber-300 to-amber-600 text-slate-950 shadow-[0_16px_36px_rgba(217,119,6,0.18)] hover:from-amber-200 hover:to-amber-500",
  secondary: "border-blue-200 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_16px_36px_rgba(37,99,235,0.20)] hover:from-blue-500 hover:to-blue-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  ghost: "border-slate-200 bg-white/75 text-slate-800 hover:border-amber-300 hover:bg-amber-50",
};

export function PrimaryButton({ children, variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
