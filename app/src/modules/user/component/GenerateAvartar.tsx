import React from "react";
import { createAvatar } from "@dicebear/core";
import { botttsNeutral, initials } from "@dicebear/collection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  seed?: string | null;
  className: string;
  variant: "botttsNeutral" | "initials";
  isCircle:boolean
}
function GenerateAvartar({ seed, className, variant ,isCircle=false }: Props) {
  let avatar;

  if (!seed) return null;
  if (variant === "botttsNeutral") {
    avatar = createAvatar(botttsNeutral, {
      seed,
    });
  } else {
    avatar = createAvatar(initials, {
      seed,
      fontWeight: 500,
      fontSize: 42,
    });
  }
  return (
    <Avatar className={cn(className)}>
      <AvatarImage className={`${isCircle && "rounded-sm" }`} src={avatar.toDataUri()} alt="avatar" />
      <AvatarFallback>{seed?.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default GenerateAvartar;
