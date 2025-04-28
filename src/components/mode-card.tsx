
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function ModeCard({ title, description, icon, onClick }: ModeCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={onClick}>
      <div className="mb-4 bg-smartsort-light-green p-3 rounded-full inline-block text-smartsort-dark-green">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <Button 
        variant="ghost" 
        className="group-hover:translate-x-1 transition-transform duration-200 p-0 h-auto text-smartsort-green"
      >
        Start <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </Card>
  );
}
