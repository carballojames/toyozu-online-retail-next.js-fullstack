"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import ToyozuLogo from "@/assets/toyozu-logo.png";

import {Label } from "@/components/ui/label";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = (await res.json()) as
        | { data: { user_id: number; username: string; role_id: number } }
        | { error: string };

      if (!res.ok || !("data" in json)) {
        setServerError("Invalid username or password");
        return;
      }

      try {
        localStorage.setItem("access_token", "db-session");
        localStorage.setItem("refresh_token", "db-session");
        localStorage.setItem("username", json.data.username);
        const roleId = Number(json.data.role_id);
        localStorage.setItem("role_id", String(Number.isFinite(roleId) ? roleId : 4));
        localStorage.setItem("user_id", String(json.data.user_id));
      } catch {}

      router.push("/");
    } catch {
      setServerError("Login failed. Please try again.");
    }
  };

  const signInAsDemoSuperuser = () => {
    try {
      localStorage.setItem("access_token", "mock-access-token");
      localStorage.setItem("refresh_token", "mock-refresh-token");
      localStorage.setItem("username", "demo-superuser");
      // Demo superuser: allow access to all areas (admin + user).
      localStorage.setItem("role_id", "0");
    } catch {}
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-primary-foreground text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch rounded-2xl shadow-lg bg-surface">
          {/* Left: mini description card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col  items-center  ">
            <img src={ToyozuLogo.src} alt="Toyozu Logo" className="h-12 w-12 mb-4" />
            <h1 className="text-2xl font-semibold">Toyozu Online Retail</h1>
            <div className="mt-2 text-sm text-muted-foreground text-center gap-4 items-center flex flex-col mt-6 ">
              <Label >
                Genuine parts, trusted brands, and fast ordering for your vehicle.
              </Label>
              <Label className="">📍 Monteverde Street, Davao City, Philippines</Label>
              <Label>📞 Sun - 09224207115, Globe - 09362616264</Label>
              <Label>✉️ Toyozu@yahoo.com</Label>
            </div>
           

          </div>

          {/* Right: login form card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back. Please enter your details.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
              <div>
                <Label className="block mb-1 text-sm">Username</Label>
                <Input
                  placeholder="Username"
                  aria-invalid={errors.username ? "true" : "false"}
                  {...register("username")}
                />
                {errors.username?.message && (
                  <p className="mt-1 text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div>
                <Label className="block mb-1 text-sm">Password</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  aria-invalid={errors.password ? "true" : "false"}
                  {...register("password")}
                />
                {errors.password?.message && (
                  <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-primary hover:underline">
                    Create one
                  </Link>
                </Label>
                <Button type="submit" disabled={isSubmitting}>
                  Sign in
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}