"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, User } from "lucide-react";
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
  const [auth, setAuth] = useState<{ isLoggedIn: boolean; roleId: string | null }>({
    isLoggedIn: false,
    roleId: null,
  });

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

    void sync();

    // Important for SSR hydration: read localStorage only after mount.
    syncAuthFromStorage();

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === "user_id") void sync();
      if (e.key === "access_token" || e.key === "role_id") syncAuthFromStorage();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:updated", (() => void sync()) as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", (() => void sync()) as EventListener);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    router.push("/");
  };

  const onSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Send user to products page with query param (adjust route as needed)
    const params = new URLSearchParams();
    if (searchValue) params.set("q", searchValue);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border px-6 py-3 flex items-center justify-between shadow-sm w-full ">
      {/* Logo */}
      <div
        className="flex items-center justify-center cursor-pointer flex-1"
        onClick={() => router.push("/")}
        role="button"
        aria-label="Go to home"
      >
        <Image src={Logo} alt="Toyozu Logo" width={60} height={60} priority />
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-lg mx-8 flex justify-center">
        <form onSubmit={onSearchSubmit} className="relative w-full max-w-[600px]">
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full pr-10 border-border"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            <Search className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-6 relative justify-center flex-1 gap-10 ">
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
              <ShoppingCart className="w-6 h-6" />
            </Button>
            <span className="absolute -bottom-1 -right-2 bg-primary text-primary-foreground text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount || 0}
            </span>
          </div>
        )}

        {/* User Menu */}
        {auth.isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="User menu" className="rounded-full">
                <User className="w-7 h-7 " />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push("/user")}>Account</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/unauthorized")}>Purchases</DropdownMenuItem>

              {(auth.roleId === "0" || auth.roleId === "1" || auth.roleId === "2" || auth.roleId === "3") && (
                <DropdownMenuItem onClick={() => router.push("/admin-dashboard")}>
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
            <Button type="button" variant="ghost" onClick={() => router.push("/auth/login")}
              className="text-sm font-medium">
              Sign In
            </Button>
            <span className="h-6 w-px bg-border" />
            <Button type="button" variant="ghost" onClick={() => router.push("/auth/register")}
              className="text-sm font-medium">
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}