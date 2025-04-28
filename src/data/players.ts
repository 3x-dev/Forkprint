
import { Player } from "@/components/player-card";
import { getRankBasedOnScore } from "./achievements";

export const generateMockPlayers = (count: number): Player[] => {
  const names = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", 
    "Sophia", "Mason", "Isabella", "Jacob", "Mia", 
    "Lucas", "Charlotte", "Alexander", "Amelia", "Benjamin",
    "Harper", "William", "Evelyn", "James", "Abigail", "Michael"
  ];
  
  return Array.from({ length: count }).map((_, index) => {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomScore = Math.floor(Math.random() * 100);
    
    return {
      id: `player-${index + 1}`,
      name: randomName,
      score: randomScore,
      rank: getRankBasedOnScore(randomScore)
    };
  }).sort((a, b) => b.score - a.score);
};

export const getCurrentPlayer = (): Player => {
  return {
    id: "current-player",
    name: "You",
    score: 0,
    rank: "Eco Explorer"
  };
};
