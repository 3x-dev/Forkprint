
import { Recycle } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <Recycle className={`text-smartsort-green ${size === "sm" ? "w-5 h-5" : size === "md" ? "w-6 h-6" : "w-7 h-7"}`} />
      <span className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-smartsort-green to-smartsort-dark-green bg-clip-text text-transparent`}>
        SmartSort
      </span>
    </div>
  );
}
