import React from "react";
import Image from "next/image";

function TopGridCard() {
  return (
    <div className="col-span-6  w-full rounded-3xl bg-[#ff7fa823] bg-[#ff7fa828]z px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 flex items-end ">
      <div className="flex lg:items-end gap-4  flex-col   md:flex-row w-full">
        <div className="flex flex-1   w-full lg:hidden items-center justify-center">
          <Image
            src="/top.png"
            alt="Security reduction visualization"
            quality={80}
            width={400}
            height={400}
            className="w-full max-w-[40rem] object-contain"
          />
        </div>
        <div className="max-w-xs space-y-2  w-fit sm:max-w-md">
          <h2
  style={{ fontWeight: 300 }}
  className="text-black/96 font-headinzg text-2xl sm:text-2xl lg:text-[28px] leading-[1.1] tracking-[-0.04em]  text-balance"
>
  See every AI recommendation strengthen your website security.
</h2>
          <p className="font-content text-xs sm:text-sm md:text-lg">
            Watch vulnerabilities vanish with every AI code patch, turning automated suggestions into bulletproof site defense instantly.
          </p>
        </div>
        <div className="hidden flex-1   w-full lg:flex items-center justify-center">
          <Image
            src="/top.png"
            alt="Security reduction visualization"
            quality={80}
            width={400}
            height={400}
            className="w-full max-w-[40rem] object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default TopGridCard;
