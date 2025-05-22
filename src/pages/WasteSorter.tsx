import React, { useState } from "react";
import { ArrowLeft, Upload, Info, BookOpen, Recycle, Trash } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ImageUploader } from "@/components/image-uploader";
import { SortingResults } from "@/components/sorting-results";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { FactCard } from "@/components/fact-card";

// Mock analysis function - in a real app, this would call an AI model
const analyzeImage = (imageUrl: string) => {
  // This is a mock function that simulates AI analysis
  // In a real app, you'd call an API endpoint for image analysis
  
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // For demonstration purposes, return mock data
      resolve({
        items: [
          {
            id: "1",
            name: "Paper Plate",
            region: { x: 50, y: 50, width: 150, height: 150 },
            disposalType: "recycle",
            confidence: 0.92,
            reasoning: "Clean paper plates can be recycled. If heavily soiled with food, they should go in landfill."
          },
          {
            id: "2",
            name: "Food Scraps",
            region: { x: 120, y: 80, width: 100, height: 80 },
            disposalType: "compost",
            confidence: 0.95,
            reasoning: "Food waste breaks down naturally and provides nutrients for soil when composted."
          },
          {
            id: "3",
            name: "Plastic Wrap",
            region: { x: 200, y: 150, width: 80, height: 40 },
            disposalType: "landfill",
            confidence: 0.88,
            reasoning: "Most plastic wraps are not recyclable due to their thin, clingy nature and contamination issues."
          }
        ],
        summary: "The image contains a paper plate with food scraps and plastic wrap. The paper plate should be recycled if clean, food scraps should be composted, and plastic wrap goes to landfill."
      });
    }, 1500);
  });
};

export interface DetectedItem {
  id: string;
  name: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  disposalType: "recycle" | "compost" | "landfill" | "special";
  confidence: number;
  reasoning: string;
}

const WasteSorter = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    items: DetectedItem[];
    summary: string;
  } | null>(null);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    setResults(null);
    analyzeImage(url)
      .then((data: { items: DetectedItem[]; summary: string }) => {
        setResults(data);
        setIsAnalyzing(false);
        toast.success("Analysis complete!");
      })
      .catch((error) => {
        console.error("Error analyzing image:", error);
        setIsAnalyzing(false);
        toast.error("Sorry, we couldn't analyze this image. Please try another.");
      });
    setIsAnalyzing(true);
  };

  const handleReset = () => {
    setImageUrl(null);
    setResults(null);
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center">
          <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Logo />
        </div>
        <h1 className="text-2xl font-bold text-center md:text-left">Waste Sorter</h1>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" className="flex gap-2">
              <Info className="h-4 w-4" /> How it works
            </Button>
          </DrawerTrigger>
          <DrawerContent className="px-4 pb-6">
            <div className="max-w-md mx-auto py-4">
              <h2 className="text-lg font-semibold mb-4">How the Waste Sorter Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 bg-forkprint-green rounded-full p-2 text-white mt-1">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Upload an image</p>
                    <p className="text-sm text-muted-foreground">Take a photo or select an image of waste items you want to sort.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 bg-forkprint-green rounded-full p-2 text-white mt-1">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Get sorting suggestions</p>
                    <p className="text-sm text-muted-foreground">Our system will analyze the image and identify different waste items.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 bg-forkprint-green rounded-full p-2 text-white mt-1">
                    <Recycle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Learn proper disposal</p>
                    <p className="text-sm text-muted-foreground">See detailed explanations about where each item should go and why.</p>
                  </div>
                </li>
              </ol>
              <FactCard 
                fact="About 75% of American waste is recyclable, but only around 30% actually gets recycled. Proper sorting is key to improving these numbers."
                className="mt-6"
              />
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <Card>
        <CardContent className="p-6">
          {!imageUrl ? (
            <ImageUploader onImageUpload={handleImageUpload} />
          ) : (
            <>
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="rounded-full bg-forkprint-light-green p-4 mb-4">
                      <Recycle className="h-8 w-8 text-forkprint-green" />
                    </div>
                    <h3 className="text-lg font-medium">Analyzing your waste items...</h3>
                    <p className="text-sm text-muted-foreground mt-2">This may take a few moments.</p>
                  </div>
                </div>
              ) : (
                <SortingResults
                  imageUrl={imageUrl}
                  results={results}
                  onReset={handleReset}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WasteSorter;
