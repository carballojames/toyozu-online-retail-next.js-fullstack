"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import ToyozuLogo from "@/assets/toyozu-logo.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      .refine((v) => !v || /^[+0-9()\-\s]{7,}$/.test(v), "Invalid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterClient() {
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

      const json =
        (await res.json()) as
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
      } catch {
        // ignore
      }

      router.push("/");
    } catch {
      setServerError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-primary-foreground text-foreground flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch rounded-2xl shadow-lg bg-surface">
          {/* Left: description card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col justify-center items-center">
            <Image src={ToyozuLogo} alt="Toyozu Logo" width={48} height={48} className="h-12 w-12 mb-4" priority />
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <Label className="mt-2 text-sm text-muted-foreground text-center">
              Join Toyozu Online Retail to browse parts, manage orders, and checkout faster.
            </Label>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <Label>Track purchases and order history</Label>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <Label>Save details for faster checkout</Label>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <Label>Search by categories and product name</Label>
              </li>
            </ul>
          </div>

          {/* Right: form card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold">Create account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fill in your details to get started.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <div>
                <Label className="block mb-1 text-sm">Name</Label>
                <Input placeholder="Your name" aria-invalid={errors.user_name ? "true" : "false"} {...register("user_name")} />
                {errors.user_name?.message ? <p className="mt-1 text-sm text-destructive">{errors.user_name.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Username</Label>
                <Input placeholder="Username" aria-invalid={errors.username ? "true" : "false"} {...register("username")} />
                {errors.username?.message ? <p className="mt-1 text-sm text-destructive">{errors.username.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Email (optional)</Label>
                <Input placeholder="you@example.com" aria-invalid={errors.email ? "true" : "false"} {...register("email")} />
                {errors.email?.message ? <p className="mt-1 text-sm text-destructive">{errors.email.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Phone (optional)</Label>
                <Input placeholder="+63..." aria-invalid={errors.mobile_phone ? "true" : "false"} {...register("mobile_phone")} />
                {errors.mobile_phone?.message ? <p className="mt-1 text-sm text-destructive">{errors.mobile_phone.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Password</Label>
                <Input type="password" placeholder="Password" aria-invalid={errors.password ? "true" : "false"} {...register("password")} />
                {errors.password?.message ? <p className="mt-1 text-sm text-destructive">{errors.password.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Confirm password</Label>
                <Input type="password" placeholder="Confirm password" aria-invalid={errors.confirm_password ? "true" : "false"} {...register("confirm_password")} />
                {errors.confirm_password?.message ? <p className="mt-1 text-sm text-destructive">{errors.confirm_password.message}</p> : null}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
                <Button type="submit" disabled={isSubmitting}>
                  Sign up
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
