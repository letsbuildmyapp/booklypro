/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"General Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"General Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "16px" }],
        footnote: ["13px", { lineHeight: "18px" }],
        subheadline: ["15px", { lineHeight: "20px" }],
        body: ["16px", { lineHeight: "24px" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        title3: ["20px", { lineHeight: "26px" }],
        title2: ["22px", { lineHeight: "28px" }],
        title1: ["28px", { lineHeight: "34px" }],
        largeTitle: ["34px", { lineHeight: "41px" }],
        display: ["clamp(48px, 8vw, 96px)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        status: {
          confirmed: "hsl(var(--status-confirmed) / <alpha-value>)",
          completed: "hsl(var(--status-completed) / <alpha-value>)",
          noshow: "hsl(var(--status-noshow) / <alpha-value>)",
          cancelled: "hsl(var(--status-cancelled) / <alpha-value>)",
          rescheduled: "hsl(var(--status-rescheduled) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 12px)",
        md: "calc(var(--radius) - 8px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
      boxShadow: {
        soft: "0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 4px 16px -2px hsl(var(--foreground) / 0.06)",
        pillow: "0 2px 4px 0 hsl(var(--foreground) / 0.04), 0 12px 32px -4px hsl(var(--foreground) / 0.08)",
        glow: "0 0 0 4px hsl(var(--primary) / 0.18)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
