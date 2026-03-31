"use client";

import Link from "next/link";
import { useRegisterForm } from "@/hooks/auth/use-register-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToyozuLogo from "@/assets/toyozu-logo.png";
import {Label } from "@/components/ui/label";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
  } = useRegisterForm();

  return (
    <div className="min-h-screen bg-primary-foreground text-foreground flex items-center justify-center ">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2  items-stretch rounded-2xl shadow-lg bg-surface">
          {/* Left: description card */}
          <div className="bg-surface text-surface-foreground  p-8 flex flex-col justify-center items-center">
            <img src={ToyozuLogo.src} alt="Toyozu Logo" className="h-12 w-12 mb-4" />
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <Label className="mt-2 text-sm text-muted-foreground">
              Join Toyozu Online Retail to browse parts, manage orders, and checkout faster.
            </Label>
            <ul className="mt-6 space-y-2 text-sm gap-6 ">
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
                {errors.email?.message && (
                  <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                )}
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
