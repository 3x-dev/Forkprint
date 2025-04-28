
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { WasteItemCard, WasteItem } from "@/components/waste-item";
import { DisposalBin, BinType } from "@/components/disposal-bin";
import { Timer } from "@/components/timer";
import { PlayerCard, Player } from "@/components/player-card";
import { AchievementBadge, Achievement } from "@/components/achievement-badge";
import { FactCard } from "@/components/fact-card";
import { getRandomWasteItems } from "@/data/waste-items";
import { generateMockPlayers, getCurrentPlayer } from "@/data/players";
import { achievements, getRankBasedOnScore } from "@/data/achievements";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Clock } from "lucide-react";

const GAME_DURATION = 60; // 1 minute in seconds

enum GameState {
  NotStarted,
  Playing,
  Finished
}

const TimedMode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>(GameState.NotStarted);
  const [currentItem, setCurrentItem] = useState<WasteItem | null>(null);
  const [selectedBin, setSelectedBin] = useState<BinType | null>(null);
  const [score, setScore] = useState(0);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  
  // Initialize leaderboard
  useEffect(() => {
    const mockPlayers = generateMockPlayers(10);
    setPlayers(mockPlayers.sort((a, b) => b.score - a.score));
  }, []);
  
  // Start game
  const startGame = () => {
    setGameState(GameState.Playing);
    setScore(0);
    setItemsProcessed(0);
    setCorrectAnswers(0);
    nextItem();
  };
  
  // Handle game over
  const handleGameOver = () => {
    setGameState(GameState.Finished);
    setCurrentItem(null);
    
    // Calculate player rank
    const rank = getRankBasedOnScore(score);
    
    // Calculate achievements
    const newAchievements = achievements.filter(achievement => {
      if (achievement.id === "3" && correctAnswers === itemsProcessed && itemsProcessed > 0) {
        return true; // Waste Wizard - perfect score
      }
      if (achievement.id === "1" && correctAnswers >= 5) {
        return true; // Recycling Rookie
      }
      return false;
    });
    
    setUnlockedAchievements(newAchievements);
    
    // Add player to leaderboard
    const currentPlayer: Player = {
      id: "current-player",
      name: "You",
      score,
      rank
    };
    
    const updatedPlayers = [...players, currentPlayer]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    setPlayers(updatedPlayers);
    
    toast({
      title: "Time's Up!",
      description: `You scored ${score} points and sorted ${correctAnswers} items correctly.`,
    });
  };
  
  // Get next item
  const nextItem = () => {
    const randomItems = getRandomWasteItems(1);
    setCurrentItem(randomItems[0]);
    setSelectedBin(null);
  };
  
  // Submit answer
  const handleSubmitAnswer = () => {
    if (!currentItem || !selectedBin) return;
    
    const isCorrect = selectedBin === currentItem.correctBin;
    
    setItemsProcessed(prev => prev + 1);
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      setCorrectAnswers(prev => prev + 1);
      
      toast({
        title: "Correct!",
        description: "+10 points",
        variant: "default",
      });
    } else {
      toast({
        title: "Incorrect",
        description: `This item goes in the ${currentItem.correctBin} bin`,
        variant: "destructive",
      });
    }
    
    nextItem();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-smartsort-light-green">
      <header className="container mx-auto pt-6 pb-4 px-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Logo />
        <div className="w-20"></div> {/* Empty div for flex spacing */}
      </header>
      
      <main className="container mx-auto px-4 py-4 mb-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Timed Mode</h1>
          
          {gameState === GameState.NotStarted && (
            <div className="glass-card p-6 text-center">
              <Clock className="w-12 h-12 text-smartsort-green mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Ready for the Challenge?</h2>
              <p className="text-muted-foreground mb-6">
                Sort as many items as you can correctly in 60 seconds.
                Each correct answer gives you 10 points!
              </p>
              <Button size="lg" onClick={startGame}>
                Start Game
              </Button>
            </div>
          )}
          
          {gameState === GameState.Playing && currentItem && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Left column - Current Item */}
              <div className="md:col-span-1">
                <div className="glass-card p-4 mb-4">
                  <h2 className="font-semibold mb-3">Current Item</h2>
                  <WasteItemCard item={currentItem} className="w-full" />
                </div>
              </div>
              
              {/* Middle column - Bins */}
              <div className="md:col-span-1">
                <div className="glass-card p-4">
                  <div className="mb-4">
                    <Timer 
                      duration={GAME_DURATION} 
                      onComplete={handleGameOver} 
                    />
                  </div>
                  
                  <h2 className="font-semibold mb-3">Where does it go?</h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <DisposalBin 
                      type="recycle" 
                      selected={selectedBin === "recycle"}
                      onClick={() => setSelectedBin("recycle")}
                    />
                    <DisposalBin 
                      type="compost" 
                      selected={selectedBin === "compost"}
                      onClick={() => setSelectedBin("compost")}
                    />
                    <DisposalBin 
                      type="landfill" 
                      selected={selectedBin === "landfill"}
                      onClick={() => setSelectedBin("landfill")}
                    />
                    <DisposalBin 
                      type="special" 
                      selected={selectedBin === "special"}
                      onClick={() => setSelectedBin("special")}
                    />
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      disabled={!selectedBin}
                      onClick={handleSubmitAnswer}
                      className="w-full"
                    >
                      Submit Answer
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Right column - Score */}
              <div className="md:col-span-1">
                <div className="glass-card p-4">
                  <h2 className="font-semibold mb-3">Your Progress</h2>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 text-center">
                    <div className="text-4xl font-bold text-smartsort-green mb-2">
                      {score}
                    </div>
                    <p className="text-muted-foreground">Points</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xl font-bold mb-1">{itemsProcessed}</div>
                      <p className="text-xs text-muted-foreground">Items Sorted</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xl font-bold mb-1">{correctAnswers}</div>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {gameState === GameState.Finished && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left column - Results */}
              <div>
                <div className="glass-card p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4">Game Over</h2>
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-smartsort-green mb-2">
                      {score}
                    </div>
                    <p className="text-lg">Total Points</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center mb-6">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold mb-1">{itemsProcessed}</div>
                      <p className="text-sm text-muted-foreground">Items Sorted</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold mb-1">{correctAnswers}</div>
                      <p className="text-sm text-muted-foreground">Correct</p>
                    </div>
                  </div>
                  
                  {unlockedAchievements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-3">Achievements Earned:</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {unlockedAchievements.map(achievement => (
                          <AchievementBadge 
                            key={achievement.id}
                            achievement={{ ...achievement, unlocked: true }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <Button onClick={startGame} size="lg">
                      Play Again
                    </Button>
                  </div>
                </div>
                
                <div className="glass-card p-4">
                  <h3 className="font-medium mb-3">Fun Facts</h3>
                  <FactCard 
                    fact="The average American creates about 4.5 pounds of trash every day. Proper sorting can reduce that amount by up to 75%."
                  />
                </div>
              </div>
              
              {/* Right column - Leaderboard */}
              <div className="glass-card p-4">
                <h2 className="font-semibold mb-3">Leaderboard</h2>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {players.map((player, index) => (
                    <PlayerCard 
                      key={player.id}
                      player={player}
                      position={index + 1}
                      isCurrentUser={player.id === "current-player"}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TimedMode;
