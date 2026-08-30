"use client";
import React from "react";
import LoginForm from "../component/LoginForm";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useTRPCClient } from "@/trpc/client";
import { toast } from "react-hot-toast";
import Image from "next/image";

function LoginView() {
  const trpc = useTRPCClient();
  const googleSignIn = useMutation({
    mutationFn: () => trpc.user.googleSignIn.mutate(),
    onSuccess: (data) => { toast.success("Redirecting to Google"); window.location.assign(data.url); },
    onError: (error) => toast.error(error.message || "Google sign-in failed"),
  });
  const githubSignIn = useMutation({
    mutationFn: () => trpc.user.githubSignIn.mutate(),
    onSuccess: (data) => { toast.success("Redirecting to GitHub"); window.location.assign(data.url); },
    onError: (error) => toast.error(error.message || "GitHub sign-in failed"),
  });

  const handleGoogleSignIn = () => {
    googleSignIn.mutate();
  };
  const handleGithubSignIn = () =>
    githubSignIn.mutate();
  return (
    <div className="w-full   min-h-[calc(100dvh-1rem)] flex flex-col">
      <div className="flex  flex-1 w-full h-full items-center justify-center">
        <div className="flex gap-1  w-72  flex-col items-center justify-center">
          <h2 className="text-xl md:text-3xl font-medium leading-relaxed tracking-wider font-heading">
            Welcome back 👏{" "}
          </h2>

          <div className="w-full mt-2">
            <Button
              type="button"
              variant={"outline"}
              disabled={googleSignIn.isPending || githubSignIn.isPending}
              className="w-full text-stone-700 shadow-xs rounded-sm capitalize flex bg-transparent leading cursor-pointer hover:text-accentz  text-accenzt items-center gap-3"
              onClick={handleGoogleSignIn}
            >
              <Image src={"/google.png"} height={15} width={15} alt="google"  />
              Continue with google
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={googleSignIn.isPending || githubSignIn.isPending}
              className="mt-2 w-full rounded-sm bg-transparent cursor-pointer text-stone-700 text-acceznt"
              onClick={handleGithubSignIn}
            >
              <Image src={"/github.png"} height={15} width={15} alt="google"  />
              Continue with GitHub
            </Button>
          </div>

          <div className="inline-flex items-center justify-center relative w-full mt-5">
            <p className="text-accent text-sm relative flex items-center w-full gap-2 after:content-[''] after:w-full after:border-b after:border-[#eee] after:translate-y-[2px] before:content-[''] before:w-full before:border-b before:border-[#eee] before:translate-y-[2px]">
              or
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

export default LoginView;
