import { Recycle } from "lucide-react";
import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

export function Logo({ size = "md", asLink = true }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const logoContent = (
    <div className="flex items-center gap-2">
      <Recycle className={`text-forkprint-green ${size === "sm" ? "w-5 h-5" : size === "md" ? "w-6 h-6" : "w-7 h-7"}`} />
      <span className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-forkprint-green to-forkprint-dark-green bg-clip-text text-transparent`}>
        Forkprint
      </span>
    </div>
  );

  if (asLink) {
    return <Link to="/">{logoContent}</Link>;
  }

  return logoContent;
}
