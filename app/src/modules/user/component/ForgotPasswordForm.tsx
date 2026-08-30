"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const trpc = useTRPCClient();
  const request = useMutation({
    mutationFn: (input: { email: string }) => trpc.user.forgotPassword.mutate(input),
    onSuccess: () => toast.success("If the account exists, a reset email has been sent"),
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={(event) => { event.preventDefault(); request.mutate({ email }); }} className="space-y-4">
        <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700">Email address</label>
        <Input id="forgot-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        <Button type="submit" disabled={request.isPending} className="w-full rounded-md bg-slate-950 hover:bg-slate-800">{request.isPending ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500"><Link href="/login" className="font-semibold text-blue-600 hover:underline">Back to sign in</Link></p>
    </div>
  );
}
