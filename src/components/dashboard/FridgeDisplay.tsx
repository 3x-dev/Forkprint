// src/components/dashboard/FridgeDisplay.tsx
import * as React from 'react';
import { Package, ThermometerSnowflake } from 'lucide-react'; // ImageOff was removed as it's not used here

// Simplified FoodItem interface for display purposes
// Ensure this matches what you need from the items fetched in Dashboard.tsx
export interface FoodItem {
  id: string;
  name: string;
  expiry_date: string; // Expecting "YYYY-MM-DD"
  image_url?: string | null;
  amount?: string | null;
}

interface FridgeDisplayProps {
  items: FoodItem[];
  isLoading: boolean;
  onNavigateToTracker: () => void;
}

const FridgeDisplay: React.FC<FridgeDisplayProps> = ({ items, isLoading, onNavigateToTracker }) => {
  // Display up to 6 items, prioritizing those with images
  const sortedItems = [...items].sort((a, b) => {
    if (a.image_url && !b.image_url) return -1;
    if (!a.image_url && b.image_url) return 1;
    // Ensure expiry_date is valid before creating Date objects
    const dateA = a.expiry_date ? new Date(a.expiry_date + 'T00:00:00') : new Date(0);
    const dateB = b.expiry_date ? new Date(b.expiry_date + 'T00:00:00') : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
  const displayItems = sortedItems.slice(0, 6);

  const getItemGridPosition = (index: number) => {
    // For a 2-column layout within the 3 rows
    const row = Math.floor(index / 2) + 1; // 0,1 -> row 1; 2,3 -> row 2; 4,5 -> row 3
    const col = (index % 2) + 1;          // 0,2,4 -> col 1; 1,3,5 -> col 2
    return { gridRowStart: row, gridColumnStart: col };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500 py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
        <p>Loading fridge contents...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-xl relative aspect-[9/12] sm:aspect-[9/13] max-w-xs sm:max-w-sm mx-auto border-4 border-slate-800 select-none">
      {/* Fridge "Seal" */}
      <div className="absolute inset-0 border-4 border-slate-500 rounded-md pointer-events-none"></div>
      <div className="absolute inset-2 border border-slate-400 rounded-sm pointer-events-none"></div>

      {/* Fridge Door Handle */}
      <div className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-5 w-3 h-20 sm:h-28 bg-slate-500 rounded-r-lg shadow-md border-t-2 border-b-2 border-r-2 border-slate-600"></div>
      <div className="absolute top-[calc(50%-3px)] -translate-y-1/2 -right-3 sm:-right-4 w-2 h-16 sm:h-24 bg-slate-400 rounded-r-md"></div>

      {/* Freezer Compartment */}
      <div className="h-1/4 bg-slate-400/30 rounded-t-sm mb-1 p-2 relative overflow-hidden">
        <div className="absolute -top-1 -left-1">
          <ThermometerSnowflake className="w-6 h-6 text-sky-300/70 opacity-50" />
        </div>
         <p className="text-[10px] text-center font-semibold text-sky-200/70 opacity-70 absolute top-1 right-1">FREEZER</p>
      </div>

      {/* Main Compartment - "Shelves" */}
      <div className="h-[calc(75%-0.25rem)] bg-slate-300/20 rounded-b-sm p-1.5 sm:p-2 grid grid-rows-3 grid-cols-2 gap-1.5 sm:gap-2 relative">
        {/* Shelf lines (visual only) */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={`shelf-line-${i}`} className="absolute w-[calc(100%-1rem)] left-2 h-0.5 bg-slate-400/40 col-span-2" style={{ top: `${(i + 1) * 33.33}%` }}></div>
        ))}
        
        {displayItems.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 col-span-2 row-span-3">
            <Package className="h-12 w-12 text-slate-400/80 mb-2" />
            <p className="text-sm font-medium text-slate-200/90">Fridge is Empty</p>
            <p className="text-xs text-slate-300/70">Add items in the Tracker!</p>
            <button 
              onClick={onNavigateToTracker}
              className="mt-2 text-xs bg-green-600 hover:bg-green-500 text-white py-1 px-2 rounded shadow"
            >
              Go to Tracker
            </button>
          </div>
        )}

        {displayItems.map((item, index) => {
            const { gridRowStart, gridColumnStart } = getItemGridPosition(index);
            const expiryDate = item.expiry_date ? new Date(item.expiry_date + 'T00:00:00') : null;
            const expiryDateString = expiryDate ? expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A';

            return (
              <div 
                key={item.id} 
                className="bg-white/10 p-1 rounded-md shadow-lg flex flex-col items-center justify-center text-center transform transition-all duration-200 hover:bg-white/20"
                title={`${item.name} - Expires: ${expiryDate ? expiryDate.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' }) : 'N/A'}${item.amount ? ` (${item.amount})` : ''}`}
                style={{ gridRowStart, gridColumnStart }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="max-w-[30px] max-h-[30px] sm:max-w-[36px] sm:max-h-[36px] object-contain mb-0.5" />
                ) : (
                  <Package className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400/90 mb-0.5" />
                )}
                <p className="text-[9px] sm:text-[10px] font-medium text-slate-100 truncate w-full px-0.5 leading-tight">{item.name}</p>
                <p className="text-[8px] sm:text-[9px] text-slate-300/80 leading-tight">
                  {expiryDateString}
                </p>
              </div>
            );
        })}
        
      </div>
      {items.length > displayItems.length && (
         <div className="absolute bottom-1.5 right-1.5 text-[9px] text-slate-300/70 bg-slate-800/50 px-1 py-0.5 rounded-sm">
            + {items.length - displayItems.length} more
        </div>
      )}
    </div>
  );
};

export default FridgeDisplay; 