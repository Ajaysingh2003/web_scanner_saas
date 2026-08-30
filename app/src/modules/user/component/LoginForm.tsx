"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const login = useMutation(
    trpc.user.login.mutationOptions({
      onSuccess: async () => {
        toast.success("Welcome back");
        await queryClient.clear();
        window.location.assign("/dashboard");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const onSubmit = async (values: LoginFormValues) => login.mutate(values);

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-stone-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            {...form.register("password")}
          />

          {form.formState.errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.password.message}
            </p>
          )}

        </div>
        <Button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-md bg-background-btn"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-stone-700 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
