
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DetectedItem } from "@/pages/WasteSorter";
import { Card } from "@/components/ui/card";
import { DisposalBin, BinType } from "@/components/disposal-bin";
import { ChevronDown, ChevronUp, Upload, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface SortingResultsProps {
  imageUrl: string;
  results: {
    items: DetectedItem[];
    summary: string;
  } | null;
  onReset: () => void;
}

export function SortingResults({ imageUrl, results, onReset }: SortingResultsProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});

  if (!results) {
    return null;
  }

  const toggleExplanation = (itemId: string) => {
    setShowExplanations({
      ...showExplanations,
      [itemId]: !showExplanations[itemId],
    });
  };

  const getItemStyle = (item: DetectedItem) => {
    return {
      position: 'absolute',
      left: `${item.region.x}px`,
      top: `${item.region.y}px`,
      width: `${item.region.width}px`,
      height: `${item.region.height}px`,
      border: selectedItem === item.id ? '3px solid #4CAF50' : '2px dashed rgba(76, 175, 80, 0.7)',
      borderRadius: '4px',
      backgroundColor: selectedItem === item.id ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
      cursor: 'pointer',
    } as React.CSSProperties;
  };

  const getBinColorForDisposal = (type: string): BinType => {
    switch (type) {
      case "recycle": return "recycle";
      case "compost": return "compost";
      case "landfill": return "landfill";
      case "special": return "special";
      default: return "landfill";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Analysis Results</h3>
        <Button onClick={onReset} variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          New Image
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="relative border rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Uploaded waste" 
              className="w-full h-auto"
            />
            {results.items.map((item) => (
              <div
                key={item.id}
                style={getItemStyle(item)}
                onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
              >
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="absolute -top-6 -left-1 bg-white px-2 py-1 text-xs font-medium rounded border shadow-sm">
                      {item.name}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <div className="flex items-center">
                        <DisposalBin 
                          type={getBinColorForDisposal(item.disposalType)} 
                          className="h-8 w-8 mr-2" 
                        />
                        <p className="text-sm capitalize">{item.disposalType}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Detected Items</h4>
          <div className="space-y-3">
            {results.items.map((item) => (
              <Card 
                key={item.id}
                className={`p-4 ${selectedItem === item.id ? 'ring-2 ring-smartsort-green' : ''}`}
                onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <DisposalBin type={getBinColorForDisposal(item.disposalType)} className="h-10 w-10" />
                    <div>
                      <h5 className="font-medium">{item.name}</h5>
                      <p className="text-xs text-muted-foreground capitalize">
                        Goes to: {item.disposalType}
                        <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {Math.round(item.confidence * 100)}% confident
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExplanation(item.id);
                    }}
                  >
                    {showExplanations[item.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Collapsible open={showExplanations[item.id] || false}>
                  <CollapsibleContent className="pt-3">
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <p className="flex items-start">
                        <Search className="h-4 w-4 mr-2 mt-0.5 text-smartsort-green" />
                        {item.reasoning}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
