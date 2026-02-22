"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginForm = z.infer<typeof loginSchema>;

export function useLoginForm() {
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
      } catch {
        // ignore storage errors
      }

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
      localStorage.setItem("role_id", "0");
    } catch {
      // ignore
    }
    router.push("/");
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
    signInAsDemoSuperuser,
  };
}