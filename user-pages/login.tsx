"use client";

import { useRouter } from "next/navigation";
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
        localStorage.setItem("role_id", String(json.data.role_id));
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
    <div className="min-h-screen bg-background text-foreground flex items-center">
      <div className="max-w-md w-full mx-auto py-20 px-4">
        <div className="bg-surface text-surface-foreground rounded-xl shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Sign in</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                Sign in
              </Button>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" className="w-full" onClick={signInAsDemoSuperuser}>
                Sign in as Demo Superuser
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}