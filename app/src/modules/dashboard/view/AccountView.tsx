"use client";

import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { User, Shield, LogOut, Save, Mail } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AccountView() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");

  const { data: profile, isLoading } = useSuspenseQuery(trpc.user.profile.queryOptions());

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (variables: { display_name: string }) => client.user.updateProfile.mutate(variables),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: trpc.user.profile.queryKey() });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (variables: { email: string }) => client.user.forgotPassword.mutate(variables),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: () => toast.error("Failed to send reset email"),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => client.user.logoutAll.mutate(),
    onSuccess: () => {
      toast.success("Signed out of all devices");
      window.location.href = "/login";
    },
    onError: () => toast.error("Failed to sign out of all devices"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Account Settings" description="Manage your personal account." icon={User} />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="Account Settings" description="Manage your personal account." icon={User} />

      <div className="grid gap-8 max-w-3xl">
        {/* Profile Section */}
        <section className="rounded-xl border border-[#e6e6e6] bg-white p-6">
          <h3 className="font-heading text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" /> Profile Information
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input value={profile?.email || ""} readOnly className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <Button
              onClick={() => updateProfileMutation.mutate({ display_name: displayName })}
              className="bg-background-btn text-white"
              disabled={updateProfileMutation.isPending || displayName === profile?.display_name}
            >
              {updateProfileMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
            </Button>
          </div>
        </section>

        {/* Security Section */}
        <section className="rounded-xl border border-[#e6e6e6] bg-white p-6">
          <h3 className="font-heading text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-500" /> Security & Authentication
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-[#e6e6e6]">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-slate-500">Reset your password via email link.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => resetPasswordMutation.mutate({ email: profile?.email || "" })}
                disabled={resetPasswordMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" /> Send Reset Link
              </Button>
            </div>

            <div className="flex items-center justify-between pb-6 border-b border-[#e6e6e6]">
              <div>
                <p className="font-medium">Two-Step Verification</p>
                <p className="text-sm text-slate-500">Add an extra layer of security.</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                Not Configured
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#f43f5e]">Sign out of all devices</p>
                <p className="text-sm text-slate-500">End all active sessions on other devices.</p>
              </div>
              <Button
                variant="outline"
                className="text-[#f43f5e] border-rose-200 hover:bg-rose-50 hover:text-[#f43f5e]"
                onClick={() => {
                  if (confirm("Are you sure you want to sign out of all devices? You will need to log in again.")) {
                    logoutAllMutation.mutate();
                  }
                }}
                disabled={logoutAllMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out All
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
