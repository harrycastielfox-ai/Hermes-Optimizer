import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>;

const styles: Record<Variant, string> = {
  primary: "border-amber-400 bg-gradient-to-r from-amber-300 to-amber-600 text-white shadow-gold hover:from-amber-400 hover:to-amber-700",
  secondary: "border-stone-200 bg-stone-950 text-white hover:bg-stone-800",
  danger: "border-amber-400/50 bg-amber-100 text-amber-900 hover:bg-amber-200",
  ghost: "border-stone-200 bg-white/70 text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900",
};

export function PrimaryButton({ children, variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
