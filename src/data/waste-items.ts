
import { WasteItem } from "@/components/waste-item";

export const wasteItems: WasteItem[] = [
  {
    id: "1",
    name: "Plastic Water Bottle",
    image: "https://images.unsplash.com/photo-1625708458528-afbabbfea263?auto=format&fit=crop&q=80&w=400",
    correctBin: "recycle",
    fact: "It takes up to 450 years for a plastic water bottle to decompose in a landfill."
  },
  {
    id: "2",
    name: "Banana Peel",
    image: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?auto=format&fit=crop&q=80&w=400", 
    correctBin: "compost",
    fact: "Banana peels make excellent compost, adding potassium and phosphorus to the soil."
  },
  {
    id: "3",
    name: "Aluminum Can",
    image: "https://images.unsplash.com/photo-1610056494052-6a4f5f1ce2a3?auto=format&fit=crop&q=80&w=400",
    correctBin: "recycle",
    fact: "Recycling one aluminum can saves enough energy to run a TV for three hours."
  },
  {
    id: "4",
    name: "Styrofoam Cup",
    image: "https://images.unsplash.com/photo-1581955957646-b7cd79ca4535?auto=format&fit=crop&q=80&w=400",
    correctBin: "landfill",
    fact: "Styrofoam can take over 500 years to decompose and is one of the most common forms of beach pollution."
  },
  {
    id: "5",
    name: "Used Batteries",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&q=80&w=400",
    correctBin: "special",
    fact: "Batteries contain heavy metals that can contaminate soil and water when not properly disposed of."
  },
  {
    id: "6",
    name: "Paper Notebook",
    image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&q=80&w=400",
    correctBin: "recycle",
    fact: "Paper can be recycled 5-7 times before the fibers become too short to be used again."
  },
  {
    id: "7",
    name: "Apple Core",
    image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&q=80&w=400",
    correctBin: "compost",
    fact: "An apple core can decompose in as little as 2 months when composted properly."
  },
  {
    id: "8",
    name: "Plastic Bag",
    image: "https://images.unsplash.com/photo-1589562131897-0e92a4d394b9?auto=format&fit=crop&q=80&w=400",
    correctBin: "landfill",
    fact: "Most plastic bags can't be recycled in standard recycling programs and can jam recycling machinery."
  }
];

export const getRandomWasteItems = (count: number): WasteItem[] => {
  const shuffled = [...wasteItems].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
