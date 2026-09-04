"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Loader2 } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { useAuthScanAction } from "@/modules/product/hooks/useAuthScanAction";

function CtaSection() {
  const [domain, setDomain] = useState("");
  const { handleScanClick, isCreating } = useAuthScanAction();

  const faviconUrl = domain.trim()
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain.trim())}&sz=64`
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      toast.error("Please enter a website address");
      return;
    }
    handleScanClick(domain.trim());
  };

  return (
    <div className="flex items-center w-full justify-center gap-4 lg:mt-6 mt-4">
      <form
        onSubmit={handleSubmit}
        className="px-2 md:px-2 pb-1 md:pb-0 rounded-lg border flex items-center justify-between flex-col sm:flex-row w-full max-w-74 md:max-w-xs sm:max-w-sm lg:max-w-md shadow-[0_2px_8px_rgba(8,21,46,0.06)] transition-[transform,box-shadow] duration-150 hover:shadow-[0_2px_2px_rgba(8,21,46,0.10)] bg-white"
      >
        <InputForSiteurl
          value={domain}
          image={faviconUrl}
          onChange={setDomain}
          disabled={isCreating}
        />

        <Button
          type="submit"
          disabled={isCreating || !domain.trim()}
          style={{ padding: "8px" }}
          className="sm:w-fit w-full py-4 tracking-normal bg-background-btn rounded-md px-3 text-white font-medium hover:opacity-95 cursor-pointer shrink-0"
        >
          {isCreating ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Creating…
            </span>
          ) : (
            "Check Website"
          )}
        </Button>
      </form>
    </div>
  );
}

export default CtaSection;

interface InputForSiteurlProps {
  value: string;
  image: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function InputForSiteurl({ value, image, onChange, disabled }: InputForSiteurlProps) {
  return (
    <div className="flex flex-col py-2 lg:p-2 gap-2 w-full">
      <div className="relative flex w-full items-center">
        {image ? (
          <div className="absolute left-1 flex items-center justify-center w-5 h-5 pointer-events-none">
            <img
              src={image}
              alt="Site Favicon"
              className="w-full h-full object-contain rounded-sm"
            />
          </div>
        ) : (
          <Globe className="text-stone-500 size-5 absolute left-1 pointer-events-none" />
        )}

        <Input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="enter your website address"
          onChange={(e) => onChange(e.target.value)}
          className="w-full placeholder:capitalize border-none outline-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none py-2.5 pl-8 pr-2 text-sm"
        />
      </div>
    </div>
  );
}
