import { createContext, useContext, useEffect } from "react";

type Ctx = { theme: "light" };

const ThemeCtx = createContext<Ctx>({ theme: "light" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try { localStorage.removeItem("theme"); } catch {}
  }, []);

  return <ThemeCtx.Provider value={{ theme: "light" }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
