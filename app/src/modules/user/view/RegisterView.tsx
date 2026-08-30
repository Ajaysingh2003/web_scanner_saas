"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { useTRPCClient } from '@/trpc/client'
import RegisterForm from '../component/RegisterForm'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

function RegisterView() {

    const trpc=useTRPCClient()
    const googleSignIn = useMutation({
      mutationFn: () => trpc.user.googleSignIn.mutate(),
      onSuccess: (data) => { toast.success('Redirecting to Google'); window.location.assign(data.url); },
      onError: (error) => toast.error(error.message || 'Google sign-up failed'),
    });
    const githubSignIn = useMutation({
      mutationFn: () => trpc.user.githubSignIn.mutate(),
      onSuccess: (data) => { toast.success('Redirecting to GitHub'); window.location.assign(data.url); },
      onError: (error) => toast.error(error.message || 'GitHub sign-up failed'),
    });
  
  const handleGoogleSignIn = () => {
  googleSignIn.mutate();
};
const handleGithubSignIn = () => githubSignIn.mutate();

  return (
    <div className='w-full  min-h-screen flex flex-col'>
        <div className='flex flex-1 w-full h-full items-center justify-center'>
            <div className='flex gap-1  flex-col items-center justify-center'>
                <h2 className='text-xl md:text-3xl font-medium leading-relaxed capitalize tracking-wider text-heading'>Sign up to upload</h2>

                <div className='w-full mt-3'>
                    <Button type="button" variant={"outline"} disabled={googleSignIn.isPending || githubSignIn.isPending} className='w-full shadow-xs rounded-sm capitalize flex bg-transparent leading cursor-pointer hover:text-accent hover:bg-black/2 text-accent items-center gap-3' onClick={handleGoogleSignIn}>
                    <Image src={"/google.png"} height={15} width={15} alt="google"  />
                        Continue with google
                    </Button>
                    <Button type="button" variant="outline" disabled={googleSignIn.isPending || githubSignIn.isPending} className="mt-2 w-full rounded-sm bg-transparent text-accent" onClick={handleGithubSignIn}>
                      <Image src={"/github.png"} height={15} width={15} alt="google"  />
                        Continue with GitHub
                    </Button>
                </div>

                <div className='inline-flex items-center justify-center relative w-full mt-5'>

                    <p className="text-accent text-sm relative flex items-center w-full gap-2 after:content-[''] after:w-full after:border-b after:border-[#eee] after:translate-y-[2px] before:content-[''] before:w-full before:border-b before:border-[#eee] before:translate-y-[2px]">
                    or
                    </p>
                </div>
                <RegisterForm/>
            </div>
        </div>
    </div>
  )
}

export default RegisterView
