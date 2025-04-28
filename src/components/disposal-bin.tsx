
import React from "react";
import { cn } from "@/lib/utils";
import { Recycle, Trash, CircleX, BookCheck } from "lucide-react";

export type BinType = "recycle" | "compost" | "landfill" | "special";

interface DisposalBinProps {
  type: BinType;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DisposalBin({ type, selected, onClick, className }: DisposalBinProps) {
  const getBinDetails = () => {
    switch (type) {
      case "recycle":
        return {
          icon: <Recycle className="h-6 w-6" />,
          label: "Recycle",
          color: "bg-blue-500",
          selectedColor: "bg-blue-600"
        };
      case "compost":
        return {
          icon: <BookCheck className="h-6 w-6" />,
          label: "Compost",
          color: "bg-green-500",
          selectedColor: "bg-green-600"
        };
      case "landfill":
        return {
          icon: <Trash className="h-6 w-6" />,
          label: "Landfill",
          color: "bg-gray-500",
          selectedColor: "bg-gray-600"
        };
      case "special":
        return {
          icon: <CircleX className="h-6 w-6" />,
          label: "Special",
          color: "bg-orange-500",
          selectedColor: "bg-orange-600"
        };
    }
  };

  const { icon, label, color, selectedColor } = getBinDetails();

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center rounded-lg p-4 transition-all duration-200",
        selected ? selectedColor : color,
        onClick && "cursor-pointer hover:opacity-90",
        "text-white shadow-sm",
        selected && "ring-4 ring-opacity-50 ring-white",
        className
      )}
      onClick={onClick}
    >
      {icon}
      <span className="mt-2 font-medium">{label}</span>
    </div>
  );
}
