import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { WasteItemCard, WasteItem } from "@/components/waste-item";
import { DisposalBin, BinType } from "@/components/disposal-bin";
import { PlayerCard, Player } from "@/components/player-card";
import { FactCard } from "@/components/fact-card";
import { generateMockPlayers, getCurrentPlayer } from "@/data/players";
import { getRandomWasteItems } from "@/data/waste-items";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

const LiveMode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Game state
  const [currentItem, setCurrentItem] = useState<WasteItem | null>(null);
  const [selectedBin, setSelectedBin] = useState<BinType | null>(null);
  const [isGuessing, setIsGuessing] = useState(true);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(getCurrentPlayer());
  
  // Initialize game
  useEffect(() => {
    const randomItems = getRandomWasteItems(1);
    setCurrentItem(randomItems[0]);
    
    const mockPlayers = generateMockPlayers(10);
    setPlayers([...mockPlayers, currentPlayer].sort((a, b) => b.score - a.score));
  }, []);
  
  // Submit guess
  const handleSubmitGuess = () => {
    if (!currentItem || !selectedBin) return;
    
    const isCorrectGuess = selectedBin === currentItem.correctBin;
    setIsCorrect(isCorrectGuess);
    setIsGuessing(false);
    
    // Update player score if correct
    if (isCorrectGuess) {
      const updatedPlayer = { 
        ...currentPlayer, 
        score: currentPlayer.score + 10 
      };
      setCurrentPlayer(updatedPlayer);
      
      // Update leaderboard
      const updatedPlayers = [...players.filter(p => p.id !== currentPlayer.id), updatedPlayer]
        .sort((a, b) => b.score - a.score);
      setPlayers(updatedPlayers);
      
      toast({
        title: "Correct!",
        description: "You earned 10 points!",
        variant: "default",
      });
    } else {
      toast({
        title: "Incorrect",
        description: `This item goes in the ${currentItem.correctBin} bin`,
        variant: "destructive",
      });
    }
  };
  
  // Next item
  const handleNextItem = () => {
    const randomItems = getRandomWasteItems(1);
    setCurrentItem(randomItems[0]);
    setSelectedBin(null);
    setIsGuessing(true);
    setIsCorrect(null);
  };

  // Calculate current player position
  const getCurrentPlayerPosition = () => {
    return players.findIndex(p => p.id === currentPlayer.id) + 1;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-forkprint-light-green">
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
          <h1 className="text-2xl font-bold mb-6">Live Mode</h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left column - Waste item */}
            <div className="md:col-span-1">
              <div className="glass-card p-4 mb-4">
                <h2 className="font-semibold mb-3">Current Item</h2>
                {currentItem && (
                  <WasteItemCard 
                    item={currentItem} 
                    showCorrectAnswer={!isGuessing}
                    className="w-full"
                  />
                )}
                
                {!isGuessing && currentItem?.fact && (
                  <div className="mt-4">
                    <FactCard fact={currentItem.fact} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Middle column - Bins */}
            <div className="md:col-span-1">
              <div className="glass-card p-4">
                <h2 className="font-semibold mb-3">Where does it go?</h2>
                
                <div className="grid grid-cols-2 gap-3">
                  <DisposalBin 
                    type="recycle" 
                    selected={selectedBin === "recycle"}
                    onClick={() => isGuessing && setSelectedBin("recycle")}
                  />
                  <DisposalBin 
                    type="compost" 
                    selected={selectedBin === "compost"}
                    onClick={() => isGuessing && setSelectedBin("compost")}
                  />
                  <DisposalBin 
                    type="landfill" 
                    selected={selectedBin === "landfill"}
                    onClick={() => isGuessing && setSelectedBin("landfill")}
                  />
                  <DisposalBin 
                    type="special" 
                    selected={selectedBin === "special"}
                    onClick={() => isGuessing && setSelectedBin("special")}
                  />
                </div>
                
                <div className="mt-6 grid grid-cols-1 gap-3">
                  {isGuessing ? (
                    <Button 
                      disabled={!selectedBin}
                      onClick={handleSubmitGuess}
                      className="w-full"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleNextItem}
                      className="w-full"
                      variant={isCorrect ? "default" : "outline"}
                    >
                      Next Item
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column - Leaderboard */}
            <div className="md:col-span-1">
              <div className="glass-card p-4">
                <h2 className="font-semibold mb-3">Live Leaderboard</h2>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {players.slice(0, 10).map((player, index) => (
                    <PlayerCard 
                      key={player.id}
                      player={player}
                      position={index + 1}
                      isCurrentUser={player.id === currentPlayer.id}
                    />
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-smartsort-light-green rounded-lg">
                  <p className="text-sm font-medium text-center">
                    Your Position: {getCurrentPlayerPosition()} of {players.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveMode;
