/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hermes: {
          bg: "#070a0f",
          panel: "#0d121c",
          panel2: "#111827",
          line: "#1f2937",
          cyan: "#22d3ee",
          green: "#34d399",
          purple: "#a78bfa",
          text: "#e5edf7",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 211, 238, 0.08)",
      },
    },
  },
  plugins: [],
};
