import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

interface Ctx {
  mode: Mode;
  resolved: "light" | "dark";
  set: (m: Mode) => void;
  toggle: () => void;
}

const ThemeCtx = createContext<Ctx | null>(null);
const KEY = "booklypro:theme";

function resolve(mode: Mode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(KEY) as Mode) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(mode));

  useEffect(() => {
    const r = resolve(mode);
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
    localStorage.setItem(KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setResolved(mql.matches ? "dark" : "light");
    mql.addEventListener("change", fn);
    return () => mql.removeEventListener("change", fn);
  }, [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, resolved, set: setMode, toggle: () => setMode(resolved === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
