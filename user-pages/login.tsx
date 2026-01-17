"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left: mini description card */}
          <div className="bg-surface text-surface-foreground rounded-xl shadow p-8 flex flex-col justify-center">
            <h1 className="text-2xl font-semibold">Toyozu Online Retail</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Genuine parts, trusted brands, and fast ordering for your vehicle.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Search products by name and category</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Check compatibility and order confidently</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Track purchases and manage your account</span>
              </li>
            </ul>
          </div>

          {/* Right: login form card */}
          <div className="bg-surface text-surface-foreground rounded-xl shadow p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back. Please enter your details.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
              <div>
                <label className="block mb-1 text-sm">Username</label>
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
                <label className="block mb-1 text-sm">Password</label>
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
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-primary hover:underline">
                    Create one
                  </Link>
                </p>
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