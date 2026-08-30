import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, SquaresIntersectIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

function CtaSection() {
  const [domain, setDomain] = useState("");
  // const domain = "sitevela.com";
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const handleChange = (val: string) => {
    setDomain(val);
  };
  return (
    <div className="flex items-center w-full  justify-center gap-4 lg:mt-6 mt-4">
      <div className=" px-2 md:px-2  pb-1 md:pb-0   rounded-lg border flex items-center  justify-between  flex-col sm:flex-row w-full max-w-74    md:max-w-xs  sm:max-w-sm lg:max-w-md  shadow-[0_2px_8px_rgba(8,21,46,0.06)] transition-[transform,box-shadow]  duration-150 hover:shadow-[0_2px_2px_rgba(8,21,46,0.10)]">
        <InputForSiteurl image={domain && faviconUrl} onChange={handleChange} />


        <Button style={{padding:"8px"}} className="sm:w-fit w-full py-4 tracking-normal   bg-background-btn rounded-md px-3">Check Website</Button>
      </div>
    </div>
  );
}

export default CtaSection;

// Define the shape of your component props
interface InputForSiteurlProps {
  image: string;
  onChange: (value: string) => void;
}

function InputForSiteurl({ image, onChange }: InputForSiteurlProps) {
  return (
    <div className="flex flex-col py-2  lg:p-2 gap-2 w-full">
      <div className="relative flex w-full  items-center">
        {/* Favicon / Image container */}
        {image != "" ? (
          <div className="absolute left-1 flex items-center justify-center w-5 h-5">
            <img
              src={image}
              alt="Site Favicon"
              className="w-full h-full object-contain rounded-sm"
            />
          </div>
        ) : (
          <Globe className="text-stone-500  size-5" />
        )}

        <Input
          type="text"
          placeholder="enter your website address"
          onChange={(e) => onChange(e.target.value)}
          className={`w-full placeholder:capitalize border-none outline-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none py-2.5 ${
            image ? "pl-10" : "pl-4"
          } pr-4`}
        />
      </div>
    </div>
  );
}
