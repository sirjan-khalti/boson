import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";

export type Role = "SUPERADMIN" | "ADMIN" | "RECRUITER" | "VIEWER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
  window.dispatchEvent(new Event("auth-change"));
}

let mePromise: Promise<any> | null = null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    if (mePromise) {
      try {
        const data = await mePromise;
        setUser(data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    mePromise = (async () => {
      const apiBase = API_BASE;
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/auth/me`, {
        headers,
        credentials: "include"
      });
      if (res.ok) {
        return res.json();
      }
      throw new Error("Failed to fetch user");
    })();

    try {
      const data = await mePromise;
      setUser(data);
    } catch (err) {
      console.error("Failed to fetch user", err);
      setUser(null);
    } finally {
      mePromise = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    const sync = () => fetchUser();
    window.addEventListener("auth-change", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPERADMIN",
    logout: async () => {
      try {
        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers,
          credentials: "include"
        });
      } catch (err) {
        console.error("Logout request failed", err);
      }
      setToken(null);
      setUser(null);
    },
  };
}

export const ROLES: Role[] = ["SUPERADMIN", "ADMIN", "RECRUITER", "VIEWER"];
