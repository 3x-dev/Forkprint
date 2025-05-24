import { Link } from "react-router-dom";
import logoUrl from "../pages/logo.png";

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

  const imageSizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7", 
  };

  const logoContent = (
    <div className="flex items-center gap-2">
      <img src={logoUrl} alt="Forkprint Logo" className={`${imageSizeClasses[size]}`} />
      <span className={`font-bold ${sizeClasses[size]} text-forkprint-green`}>
        Forkprint
      </span>
    </div>
  );

  if (asLink) {
    return <Link to="/">{logoContent}</Link>;
  }

  return logoContent;
}
