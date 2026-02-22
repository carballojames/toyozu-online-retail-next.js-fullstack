"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const registerSchema = z
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

export type RegisterForm = z.infer<typeof registerSchema>;

export function useRegisterForm() {
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
      } catch {
        // ignore
      }

      router.push("/");
    } catch {
      setServerError("Registration failed. Please try again.");
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
  };
}