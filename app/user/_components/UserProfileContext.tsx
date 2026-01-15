"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type UserProfile = {
  id: number;
  user_name: string;
  email?: string;
  username?: string;
  mobile_phone?: string;
  role_id?: number;
  profile_picture?: string | null;
};

type Ctx = {
  user: UserProfile | null;
  loadingUser: boolean;
  profileError: string | null;
  refresh: () => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<boolean>;
};

const UserProfileContext = createContext<Ctx | null>(null);

const USER_PROFILE_CACHE_KEY = "user_profile_cache_v1";
const USER_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

function readUserIdFromStorage(): number {
  if (typeof window === "undefined") return NaN;
  try {
    const raw = localStorage.getItem("user_id");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : NaN;
  } catch {
    return NaN;
  }
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(USER_PROFILE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user: UserProfile; ts: number };
      if (!parsed?.user || typeof parsed.ts !== "number") return null;
      if (Date.now() - parsed.ts > USER_PROFILE_CACHE_TTL_MS) return null;
      return parsed.user;
    } catch {
      return null;
    }
  });
  const [loadingUser, setLoadingUser] = useState(() => user === null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingUser(true);
    setProfileError(null);

    try {
      const userId = readUserIdFromStorage();
      if (!Number.isFinite(userId)) {
        setUser(null);
        setProfileError("Please sign in to view your account.");
        return;
      }

      const res = await fetch(`/api/me?userId=${encodeURIComponent(String(userId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: UserProfile; error?: string };
      if (!res.ok || !json.data) {
        setUser(null);
        setProfileError(json.error || "Failed to load profile.");
        return;
      }

      setUser(json.data);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          USER_PROFILE_CACHE_KEY,
          JSON.stringify({ user: json.data, ts: Date.now() })
        );
      }
    } catch {
      setUser(null);
      setProfileError("Failed to load profile.");
    } finally {
      if (!opts?.silent) setLoadingUser(false);
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    try {
      const userId = user?.id ?? readUserIdFromStorage();
      if (!Number.isFinite(userId)) return false;

      const form = new FormData();
      form.append("userId", String(userId));
      form.append("file", file);

      const res = await fetch("/api/me/profile-picture", {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as { data?: { profile_picture: string }; error?: string };
      if (!res.ok || !json.data?.profile_picture) return false;

      setUser((prev) => (prev ? { ...prev, profile_picture: json.data!.profile_picture } : prev));
      return true;
    } catch {
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh({ silent: user !== null });
  }, [refresh, user]);

  const value = useMemo<Ctx>(
    () => ({ user, loadingUser, profileError, refresh, uploadProfilePicture }),
    [user, loadingUser, profileError, refresh, uploadProfilePicture]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
}
