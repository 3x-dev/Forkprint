
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  className?: string;
}

export function Timer({ duration, onComplete, className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  
  useEffect(() => {
    if (!isRunning) return;
    
    if (timeLeft <= 0) {
      setIsRunning(false);
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, isRunning, onComplete]);
  
  const progress = Math.max(0, (timeLeft / duration) * 100);
  
  const getColorClass = () => {
    if (progress > 60) return "bg-smartsort-green";
    if (progress > 30) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center text-sm font-medium">
        <span>Time Remaining</span>
        <span className={cn(
          progress <= 30 ? "text-red-500" : progress <= 60 ? "text-yellow-500" : ""
        )}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-2 bg-gray-100" 
        indicatorClassName={getColorClass()}
      />
    </div>
  );
}
