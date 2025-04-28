
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked?: boolean;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  className?: string;
}

export function AchievementBadge({ achievement, className }: AchievementBadgeProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center p-4 rounded-xl text-center",
        achievement.unlocked 
          ? "bg-gradient-to-b from-smartsort-light-green to-white border-smartsort-green shadow-md"
          : "bg-gray-100 border-gray-200 opacity-70",
        "border-2",
        className
      )}
    >
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center mb-3",
        achievement.unlocked ? "bg-smartsort-green text-white" : "bg-gray-200 text-gray-400"
      )}>
        <Trophy className="w-8 h-8" />
      </div>
      
      <h3 className="font-bold mb-1">{achievement.title}</h3>
      <p className="text-xs text-muted-foreground">{achievement.description}</p>
      
      {!achievement.unlocked && (
        <div className="mt-2 text-xs font-medium text-gray-500">Locked</div>
      )}
    </div>
  );
}
