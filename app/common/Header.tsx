"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingCart, User } from "lucide-react";
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
      if (Number.isFinite(userId)) {
        try {
          const res = await fetch(`/api/cart?userId=${encodeURIComponent(String(userId))}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          const json = (await res.json()) as { data?: { items?: unknown[] } };
          if (res.ok && json.data && Array.isArray(json.data.items)) {
            setCartCount(json.data.items.length);
            return;
          }
        } catch {
          // fall back below
        }
      }

      setCartCount(getCartCountFromStorage());
    };

    const syncUsername = async () => {
      const userId = readUserIdFromStorage();
      if (!Number.isFinite(userId)) {
        setUsername(null);
        return;
      }

      try {
        const res = await fetch(`/api/me?userId=${encodeURIComponent(String(userId))}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = (await res.json()) as { data?: { username?: string | null } };
        const nextUsername = json?.data?.username;
        setUsername(typeof nextUsername === "string" && nextUsername.trim() ? nextUsername : null);
      } catch {
        setUsername(null);
      }
    };

    void sync();
    void syncUsername();

    // Important for SSR hydration: read localStorage only after mount.
    const authTimer = window.setTimeout(() => syncAuthFromStorage(), 0);

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === "user_id") void sync();
      if (e.key === "access_token" || e.key === "role_id") syncAuthFromStorage();
      if (e.key === "user_id") void syncUsername();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:updated", (() => void sync()) as EventListener);
    return () => {
      window.clearTimeout(authTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", (() => void sync()) as EventListener);
    };
  }, []);

  const accountBasePath = username ? `/user/${encodeURIComponent(username)}` : "/user";

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
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

        {/* Right: mobile/tablet actions (search icon + sandwich menu) */}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {auth.isLoggedIn ? (
                <>
                  <DropdownMenuItem onClick={() => router.push("/cart")}>
                    Cart ({cartCount || 0})
                  </DropdownMenuItem>
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
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => router.push("/auth/login")}>Sign In</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/auth/register")}>Sign Up</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="lg:hidden absolute left-0 right-0 top-full border-b border-border bg-surface shadow-sm">
            <div className="mx-auto w-full max-w-[1270px] px-4 sm:px-6 py-2">
              <form onSubmit={onSearchSubmit} className="relative w-full">
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
    </header>
  );
}