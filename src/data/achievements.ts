
import { Achievement } from "@/components/achievement-badge";

export const achievements: Achievement[] = [
  {
    id: "1",
    title: "Recycling Rookie",
    description: "Correctly sort 5 items into the recycling bin",
    icon: "trophy",
  },
  {
    id: "2",
    title: "Compost Captain",
    description: "Correctly sort 10 compostable items",
    icon: "award",
  },
  {
    id: "3",
    title: "Waste Wizard",
    description: "Achieve a perfect score in timed mode",
    icon: "star",
  },
  {
    id: "4",
    title: "Sorting Specialist",
    description: "Play both game modes at least 5 times each",
    icon: "medal",
  },
  {
    id: "5",
    title: "Green Guardian",
    description: "Accumulate 100 points across all games",
    icon: "leaf",
  }
];

export const getRankBasedOnScore = (score: number): string => {
  if (score >= 100) return "Waste Wizard";
  if (score >= 75) return "Compost Captain";
  if (score >= 50) return "Recycling Ranger";
  if (score >= 25) return "Sorting Student";
  return "Eco Explorer";
};
