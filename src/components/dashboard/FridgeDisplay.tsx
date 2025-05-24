// src/components/dashboard/FridgeDisplay.tsx
import * as React from 'react';
import { useState } from 'react';
import { Package, ChevronLeft, ChevronRight, Snowflake } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  
  // Sort items prioritizing those with images, then by expiry date
  const sortedItems = [...items].sort((a, b) => {
    if (a.image_url && !b.image_url) return -1;
    if (!a.image_url && b.image_url) return 1;
    // Ensure expiry_date is valid before creating Date objects
    const dateA = a.expiry_date ? new Date(a.expiry_date + 'T00:00:00') : new Date(0);
    const dateB = b.expiry_date ? new Date(b.expiry_date + 'T00:00:00') : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const displayItems = sortedItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getItemGridPosition = (index: number) => {
    // For a 2-column layout within the 4 rows
    const row = Math.floor(index / 2) + 1; // 0,1 -> row 1; 2,3 -> row 2; 4,5 -> row 3; 6,7 -> row 4
    const col = (index % 2) + 1;          // 0,2,4,6 -> col 1; 1,3,5,7 -> col 2
    return { gridRowStart: row, gridColumnStart: col };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500 py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
        <p className="text-base font-medium">Loading fridge contents...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-slate-700 p-4 sm:p-5 rounded-lg shadow-xl relative aspect-[9/12] sm:aspect-[9/13] max-w-sm sm:max-w-md mx-auto border-4 border-slate-800 select-none">
        {/* Fridge "Seal" */}
        <div className="absolute inset-0 border-4 border-slate-500 rounded-md pointer-events-none"></div>
        <div className="absolute inset-2 border border-slate-400 rounded-sm pointer-events-none"></div>

        {/* Fridge Door Handle */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-5 w-3 h-20 sm:h-28 bg-slate-500 rounded-r-lg shadow-md border-t-2 border-b-2 border-r-2 border-slate-600"></div>
        <div className="absolute top-[calc(50%-3px)] -translate-y-1/2 -right-3 sm:-right-4 w-2 h-16 sm:h-24 bg-slate-400 rounded-r-md"></div>

        {/* Freezer Compartment */}
        <div className="h-1/5 bg-slate-400/30 rounded-t-sm mb-1 p-2 relative overflow-hidden">
          <div className="absolute top-1 left-1">
            <Snowflake className="w-4 h-4 text-sky-300/80" />
          </div>
        </div>

        {/* Main Compartment - "Shelves" */}
        <div className="h-[calc(80%-0.25rem)] bg-slate-300/20 rounded-b-sm p-2 sm:p-3 grid grid-rows-4 grid-cols-2 gap-2 sm:gap-2.5 relative">
          {/* Shelf lines (visual only) */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`shelf-line-${i}`} className="absolute w-[calc(100%-1.5rem)] left-3 h-0.5 bg-slate-400/40 col-span-2" style={{ top: `${(i + 1) * 25}%` }}></div>
          ))}
          
          {displayItems.length === 0 && !isLoading && sortedItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 col-span-2 row-span-4">
              <Package className="h-16 w-16 text-slate-400/80 mb-3" />
              <p className="text-base font-semibold text-slate-200/90">Fridge is Empty</p>
              <p className="text-sm text-slate-300/70 mb-3">Add items in the Tracker!</p>
              <button 
                onClick={onNavigateToTracker}
                className="text-sm font-medium bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded shadow transition-colors"
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
                  className="bg-white/10 p-1.5 rounded-md shadow-lg flex flex-col items-center justify-center text-center transform transition-all duration-200 hover:bg-white/20 hover:scale-105"
                  title={`${item.name} - Expires: ${expiryDate ? expiryDate.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' }) : 'N/A'}${item.amount ? ` (${item.amount})` : ''}`}
                  style={{ gridRowStart, gridColumnStart }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="max-w-[36px] max-h-[36px] sm:max-w-[42px] sm:max-h-[42px] object-contain mb-1" />
                  ) : (
                    <Package className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400/90 mb-1" />
                  )}
                  <p className="text-xs font-medium text-slate-100 truncate w-full px-0.5 leading-tight">{item.name}</p>
                  <p className="text-[10px] text-slate-300/80 leading-tight font-medium">
                    {expiryDateString}
                  </p>
                </div>
              );
          })}
        </div>

        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-sm">
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentPage ? 'bg-green-400' : 'bg-slate-400/60'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Item count indicator */}
        {sortedItems.length > itemsPerPage && (
          <div className="absolute bottom-1 right-1 text-xs text-slate-300/70 bg-slate-800/50 px-2 py-1 rounded-sm font-medium">
            {displayItems.length} of {sortedItems.length}
          </div>
        )}
      </div>

      {/* Navigation buttons for scrolling */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-4">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages - 1}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage >= totalPages - 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FridgeDisplay; 