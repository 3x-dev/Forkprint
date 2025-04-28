
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ModeCard } from "@/components/mode-card";
import { Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-smartsort-light-green">
      <header className="container mx-auto pt-8 pb-4 px-4">
        <Logo size="lg" />
        <p className="text-muted-foreground mt-1">Learn waste sorting the fun way</p>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <section className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Ready to play?</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Choose a game mode and start your waste sorting adventure.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ModeCard 
                title="Live Mode" 
                description="Scan items and compete on a live leaderboard with your classmates." 
                icon={<Users className="h-6 w-6" />}
                onClick={() => navigate("/live-mode")}
              />
              <ModeCard 
                title="Timed Mode" 
                description="Sort as many items as you can in one minute to earn the highest score." 
                icon={<Clock className="h-6 w-6" />}
                onClick={() => navigate("/timed-mode")}
              />
            </div>
          </section>
          
          <section className="glass-card p-6 mb-10">
            <h2 className="text-xl font-semibold mb-4">Why Waste Sorting Matters</h2>
            <p className="mb-4">
              When recycling is contaminated with food, plastic bags, or e-waste, 
              entire batches are sent to landfills. This increases landfill use, 
              wastes recyclable material, and contributes to pollution.
            </p>
            <p className="mb-4">
              SmartSort helps solve this by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Reducing recycling contamination using AI-guided disposal</li>
              <li>Educating users on proper sorting with instant tips</li>
              <li>Encouraging more mindful waste behavior through gamification</li>
              <li>Making correct sorting faster, simpler, and more accessible</li>
            </ul>
          </section>
        </div>
      </main>
      
      <footer className="container mx-auto py-6 px-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} SmartSort. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
