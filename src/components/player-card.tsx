
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Player {
  id: string;
  name: string;
  score: number;
  rank?: string;
}

interface PlayerCardProps {
  player: Player;
  position: number;
  isCurrentUser?: boolean;
  className?: string;
}

export function PlayerCard({ player, position, isCurrentUser, className }: PlayerCardProps) {
  const getPositionColor = () => {
    switch (position) {
      case 1: return "bg-yellow-500";
      case 2: return "bg-gray-400";
      case 3: return "bg-amber-700";
      default: return "bg-gray-200";
    }
  };

  const getPositionTextColor = () => {
    switch (position) {
      case 1:
      case 2:
      case 3: return "text-white";
      default: return "text-gray-700";
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center p-3 rounded-lg",
        isCurrentUser ? "bg-smartsort-light-green border border-smartsort-green" : "bg-white border",
        className
      )}
    >
      <div 
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm mr-3",
          getPositionColor(),
          getPositionTextColor()
        )}
      >
        {position}
      </div>
      
      <Avatar className="h-10 w-10 mr-3">
        <AvatarFallback className="bg-smartsort-green text-white">
          {player.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <p className="font-medium">{player.name}</p>
        {player.rank && (
          <p className="text-xs text-muted-foreground">{player.rank}</p>
        )}
      </div>
      
      <div className="bg-smartsort-green text-white rounded-full px-3 py-1 font-medium">
        {player.score}
      </div>
    </div>
  );
}
