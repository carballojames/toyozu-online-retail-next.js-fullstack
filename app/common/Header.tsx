"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Home, Search, ShoppingCart, User, Package } from "lucide-react";
import Logo from "@/assets/toyozu-logo.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CART_STORAGE_KEY = "cartItems";

const HEADER_CACHE_TTL_MS = 30_000;

type HeaderCacheEntry<T> = { value: T; ts: number };

function readSessionCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeaderCacheEntry<T>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > HEADER_CACHE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: HeaderCacheEntry<T> = { value, ts: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

function getCartCountFromStorage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return 0;
    return parsed.length;
  } catch {
    return 0;
  }
}

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

export default function Header() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState<number>(0);
  const [searchValue, setSearchValue] = useState<string>("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [auth, setAuth] = useState<{ isLoggedIn: boolean; roleId: string | null }>({
    isLoggedIn: false,
    roleId: null,
  });
  const [username, setUsername] = useState<string | null>(null);

  const syncAuthFromStorage = () => {
    if (typeof window === "undefined") return;
    try {
      setAuth({
        isLoggedIn: !!localStorage.getItem("access_token"),
        roleId: localStorage.getItem("role_id"),
      });
    } catch {
      setAuth({ isLoggedIn: false, roleId: null });
    }
  };

  useEffect(() => {
    const sync = async () => {
      const userId = readUserIdFromStorage();
      if (!Number.isFinite(userId)) {
        setUsername(null);
        setCartCount(getCartCountFromStorage());
        return;
      }

      const cartCacheKey = `header:cartCount:${userId}`;
      const usernameCacheKey = `header:username:${userId}`;

      const cachedCart = readSessionCache<number>(cartCacheKey);
      const cachedUsername = readSessionCache<string | null>(usernameCacheKey);

      if (cachedCart !== null) setCartCount(cachedCart);
      if (cachedUsername !== null) setUsername(cachedUsername);

      const cartReq = fetch(`/api/cart?userId=${encodeURIComponent(String(userId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const meReq = fetch(`/api/me?userId=${encodeURIComponent(String(userId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const [cartRes, meRes] = await Promise.allSettled([cartReq, meReq]);

      if (cartRes.status === "fulfilled") {
        try {
          const res = cartRes.value;
          const json = (await res.json()) as { data?: { items?: unknown[] } };
          if (res.ok && json.data && Array.isArray(json.data.items)) {
            const nextCount = json.data.items.length;
            setCartCount(nextCount);
            writeSessionCache(cartCacheKey, nextCount);
          } else {
            const fallback = getCartCountFromStorage();
            setCartCount(fallback);
          }
        } catch {
          setCartCount(getCartCountFromStorage());
        }
      }

      if (meRes.status === "fulfilled") {
        try {
          const res = meRes.value;
          const json = (await res.json()) as { data?: { username?: string | null } };
          const nextUsername = json?.data?.username;
          const normalized = typeof nextUsername === "string" && nextUsername.trim() ? nextUsername : null;
          setUsername(normalized);
          writeSessionCache(usernameCacheKey, normalized);
        } catch {
          setUsername(null);
        }
      }
    };

    void sync();

    // Important for SSR hydration: read localStorage only after mount.
    const authTimer = window.setTimeout(() => syncAuthFromStorage(), 0);

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === "user_id") void sync();
      if (e.key === "access_token" || e.key === "role_id") syncAuthFromStorage();
    };

    const onCartUpdated = () => void sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:updated", onCartUpdated);
    return () => {
      window.clearTimeout(authTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", onCartUpdated);
    };
  }, []);

  const accountBasePath = username ? `/user/${encodeURIComponent(username)}` : "/user";

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    // Update local UI state immediately so the header reflects logout
    setAuth({ isLoggedIn: false, roleId: null });
    setUsername(null);
    setCartCount(0);

    // Notify other listeners (other tabs) if any rely on storage events
    try {
      // Some browsers allow constructing a StorageEvent; this is best-effort
      const ev = new StorageEvent("storage", { key: "access_token", oldValue: null, newValue: null });
      window.dispatchEvent(ev);
    } catch {
      // ignore if not supported
    }

    router.push("/");
  };

  const onSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Send user to products page searching by product name only
    const params = new URLSearchParams();
    const trimmed = String(searchValue ?? "").trim();
    if (trimmed) {
      params.set("name", trimmed);
      setMobileSearchOpen(false);
      router.push(`/products?${params.toString()}`);
    } else {
      // No search term: go to products index
      setMobileSearchOpen(false);
      router.push(`/products`);
    }
  };

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [mobileSearchOpen]);

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm w-full">
      <div className="relative mx-auto w-full max-w-[1270px] px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: logo */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
            aria-label="Go to home"
          >
            <Image
              src={Logo}
              alt="Toyozu Logo"
              width={56}
              height={56}
              priority
              className="h-10 w-10 sm:h-12 sm:w-12"
            />
            <span className="font-medium text-lg italic">Davao Toyozu Inc.</span>
          </button>
        </div>

        {/* Center: desktop search */}
        <div className="hidden lg:block w-full max-w-xl px-6 ">
          <form onSubmit={onSearchSubmit} className="relative w-full">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search product name"
              className="w-full rounded-full pr-10 border-border h-10"
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>
        </div>

        {/* Right: mobile/tablet actions (search icon only) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={mobileSearchOpen ? "Close search" : "Search"}
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop right side (icons) */}
        <div className="hidden w-full lg:flex items-center justify-end gap-24 flex-1">
          {auth.isLoggedIn && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push("/cart")}
                aria-label="Cart"
                className="relative cursor-pointer rounded-full"
              >
                <ShoppingCart className="h-6 w-6" />
              </Button>
              <span className="absolute -bottom-1 -right-2 bg-primary text-primary-foreground text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount || 0}
              </span>
            </div>
          )}

          {auth.isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="User menu" className="rounded-full">
                  <User className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => router.push(accountBasePath)}>Account</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`${accountBasePath}/orders`)}>Purchases</DropdownMenuItem>

                {(auth.roleId === "0" || auth.roleId === "1" || auth.roleId === "2" || auth.roleId === "3") && (
                  <DropdownMenuItem onClick={() => router.push("/admin-dashboard/product-management")}>
                    Admin Dashboard
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push("/auth/login")} className="text-sm font-medium">
                Sign In
              </Button>
              <span className="h-6 w-px bg-border" />
              <Button type="button" variant="ghost" onClick={() => router.push("/auth/register")} className="text-sm font-medium">
                Sign Up
              </Button>
            </div>
          )}
        </div>

        {/* Mobile/tablet search overlay (keeps header single-row) */}
        {mobileSearchOpen && (
          <div className="lg:hidden absolute right-1 top-full border-b border-border bg-surface shadow-sm w-[400px]">
            <div className="mx-auto w-full max-w-[1270px] px-4 sm:px-6 py-2">
              <form onSubmit={onSearchSubmit} className="relative ">
                <Input
                  ref={mobileSearchInputRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search product name"
                  className="w-full rounded-full pr-10 border-border h-10"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom navigation (sticky) */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="mx-auto w-full max-w-[1270px] px-3">
          <div className="grid grid-cols-4 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <Button
              type="button"
              variant="ghost"
              className="h-auto flex flex-col items-center gap-1 py-2"
              onClick={() => router.push("/")}
            >
              <Home className="h-5 w-5" />
              <span className="text-[11px]">Home</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-auto flex flex-col items-center gap-1 py-2"
              onClick={() => router.push("/products")}
            >
              <Package className="h-5 w-5" />
              <span className="text-[11px]">Products</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-auto flex flex-col items-center gap-1 py-2"
              onClick={() => router.push(auth.isLoggedIn ? "/cart" : "/auth/login")}
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                {auth.isLoggedIn ? (
                  <span className="absolute -top-2 -right-3 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {cartCount || 0}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px]">Cart</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-auto flex flex-col items-center gap-1 py-2"
              onClick={() => {
                if (!auth.isLoggedIn) {
                  router.push("/auth/login");
                  return;
                }
                router.push(accountBasePath);
              }}
            >
              <User className="h-5 w-5" />
              <span className="text-[11px]">Account</span>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}