"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

const registerSchema = z
  .object({
    user_name: z.string().min(1, "Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email"),
    mobile_phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || /^[+0-9()\-\s]{7,}$/.test(v),
        "Invalid phone number"
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_name: "",
      username: "",
      email: "",
      mobile_phone: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: data.user_name,
          username: data.username,
          email: data.email || undefined,
          mobile_phone: data.mobile_phone || undefined,
          password: data.password,
        }),
      });

      const json = (await res.json()) as
        | {
            data: {
              user_id: number;
              username: string;
              user_name: string;
              role_id: number;
              is_superuser: boolean | null;
            };
          }
        | { error: string };

      if (!res.ok || !("data" in json)) {
        setServerError("error" in json ? json.error : "Registration failed");
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
      setServerError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center">
      <div className="max-w-md w-full mx-auto py-20 px-4">
        <div className="bg-surface text-surface-foreground rounded-xl shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Create account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

            <div>
              <label className="block mb-1 text-sm">Name</label>
              <Input
                placeholder="Your name"
                aria-invalid={errors.user_name ? "true" : "false"}
                {...register("user_name")}
              />
              {errors.user_name?.message && (
                <p className="mt-1 text-sm text-destructive">{errors.user_name.message}</p>
              )}
            </div>

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
              <label className="block mb-1 text-sm">Email (optional)</label>
              <Input
                placeholder="you@example.com"
                aria-invalid={errors.email ? "true" : "false"}
                {...register("email")}
              />
              {errors.email?.message && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block mb-1 text-sm">Phone (optional)</label>
              <Input
                placeholder="+63..."
                aria-invalid={errors.mobile_phone ? "true" : "false"}
                {...register("mobile_phone")}
              />
              {errors.mobile_phone?.message && (
                <p className="mt-1 text-sm text-destructive">{errors.mobile_phone.message}</p>
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

            <div>
              <label className="block mb-1 text-sm">Confirm password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                aria-invalid={errors.confirm_password ? "true" : "false"}
                {...register("confirm_password")}
              />
              {errors.confirm_password?.message && (
                <p className="mt-1 text-sm text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                Sign up
              </Button>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/auth/login")}>
                Already have an account? Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
