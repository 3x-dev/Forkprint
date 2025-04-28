
import React from "react";
import { cn } from "@/lib/utils";

export interface WasteItem {
  id: string;
  name: string;
  image: string;
  correctBin: "recycle" | "compost" | "landfill" | "special";
  fact?: string;
}

interface WasteItemCardProps {
  item: WasteItem;
  selected?: boolean;
  showCorrectAnswer?: boolean;
  className?: string;
  onClick?: () => void;
}

export function WasteItemCard({ 
  item, 
  selected, 
  showCorrectAnswer,
  className,
  onClick 
}: WasteItemCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-2xl overflow-hidden border shadow-sm transition-all duration-200",
        selected && "ring-2 ring-smartsort-green",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 bg-white">
        <h3 className="font-medium text-sm">{item.name}</h3>
        
        {showCorrectAnswer && (
          <div className="mt-2 text-xs px-2 py-1 rounded-full inline-block bg-smartsort-light-green text-smartsort-dark-green">
            {item.correctBin === "recycle" && "♻️ Recycle"}
            {item.correctBin === "compost" && "🌱 Compost"}
            {item.correctBin === "landfill" && "🗑️ Landfill"}
            {item.correctBin === "special" && "⚠️ Special Waste"}
          </div>
        )}
      </div>
    </div>
  );
}
