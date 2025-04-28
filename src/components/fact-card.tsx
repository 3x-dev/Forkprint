
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface FactCardProps {
  fact: string;
  className?: string;
}

export function FactCard({ fact, className }: FactCardProps) {
  return (
    <Card className={cn("p-4 bg-smartsort-light-green border-none", className)}>
      <div className="flex items-start gap-3">
        <div className="bg-smartsort-green rounded-full p-2 text-white mt-1 flex-shrink-0">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-smartsort-dark-green mb-1">Fun Fact</h4>
          <p className="text-sm">{fact}</p>
        </div>
      </div>
    </Card>
  );
}
