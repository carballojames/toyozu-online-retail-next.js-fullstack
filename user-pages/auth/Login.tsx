"use client";

import Image from "next/image";
import Link from "next/link";

import ToyozuLogo from "@/assets/toyozu-logo.png";
import { useLoginForm } from "@/hooks/auth/use-login-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginClient() {
  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
    signInAsDemoSuperuser,
  } = useLoginForm();

  return (
    <div className="min-h-screen bg-primary-foreground text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch rounded-2xl shadow-lg bg-surface">
          {/* Left: mini description card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col items-center">
            <Image src={ToyozuLogo} alt="Toyozu Logo" width={48} height={48} className="h-12 w-12 mb-4" priority />
            <h1 className="text-2xl font-semibold">Toyozu Online Retail</h1>
            <div className="mt-6 text-sm text-muted-foreground text-center gap-4 items-center flex flex-col">
              <Label>Genuine parts, trusted brands, and fast ordering for your vehicle.</Label>
              <Label>📍 Monteverde Street, Davao City, Philippines</Label>
              <Label>📞 Sun - 09224207115, Globe - 09362616264</Label>
              <Label>✉️ Toyozu@yahoo.com</Label>
            </div>

            <Button type="button" variant="outline" className="mt-6" onClick={signInAsDemoSuperuser}>
              Demo Admin Login
            </Button>
          </div>

          {/* Right: login form card */}
          <div className="bg-surface text-surface-foreground p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back. Please enter your details.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <div>
                <Label className="block mb-1 text-sm">Username</Label>
                <Input placeholder="Username" aria-invalid={errors.username ? "true" : "false"} {...register("username")} />
                {errors.username?.message ? <p className="mt-1 text-sm text-destructive">{errors.username.message}</p> : null}
              </div>

              <div>
                <Label className="block mb-1 text-sm">Password</Label>
                <Input type="password" placeholder="Password" aria-invalid={errors.password ? "true" : "false"} {...register("password")} />
                {errors.password?.message ? <p className="mt-1 text-sm text-destructive">{errors.password.message}</p> : null}
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
