import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Package, TrendingUp, BarChart3, PlusCircle, Edit, Trash2, Lightbulb, CalendarIcon, ImageOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// Spoonacular API configuration
const SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const SPOONACULAR_IMAGE_BASE_URL = "https://spoonacular.com/cdn/ingredients_100x100/";

// Anthropic API configuration
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// OpenRouter API configuration 
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const YOUR_SITE_URL = window.location.origin;
const YOUR_APP_NAME = "Forkprint";

// Debug function to check environment variables (for troubleshooting)
const debugEnvironmentVariables = () => {
  console.log('=== Environment Variables Debug ===');
  console.log('ANTHROPIC_API_KEY present:', !!ANTHROPIC_API_KEY);
  console.log('ANTHROPIC_API_KEY length:', ANTHROPIC_API_KEY?.length || 0);
  console.log('ANTHROPIC_API_KEY starts with:', ANTHROPIC_API_KEY?.substring(0, 10) || 'undefined');
  console.log('SPOONACULAR_API_KEY present:', !!SPOONACULAR_API_KEY);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Current origin:', window.location.origin);
  console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
  console.log('===================================');
};

// Define Packaging Types
// TODO: Refine these categories and their low-waste status based on further research or specific app goals.
const packagingTypes = [
  { id: 'NO_PACKAGING', label: 'No Packaging (e.g., loose produce)', isLowWaste: true },
  { id: 'BULK_OWN_CONTAINER', label: 'Bulk (dispensed into own container)', isLowWaste: true },
  { id: 'REUSABLE_CONTAINER', label: 'Reusable Container (e.g., returnable bottle, own lunchbox)', isLowWaste: true },
  { id: 'PAPER_CARDBOARD', label: 'Paper/Cardboard (uncoated, recyclable)', isLowWaste: true },
  { id: 'GLASS', label: 'Glass (recyclable jar/bottle)', isLowWaste: true },
  { id: 'METAL', label: 'Metal (aluminum/steel can)', isLowWaste: true },
  { id: 'COMPOSTABLE_CERTIFIED', label: 'Compostable (certified home/industrial)', isLowWaste: true },
  { id: 'PLASTIC_RIGID_PET_HDPE', label: 'Plastic - Rigid, Recyclable (e.g., PET bottles #1, HDPE jugs #2)', isLowWaste: false }, // Marked false for now to encourage better
  { id: 'PLASTIC_FILM', label: 'Plastic - Film (e.g., wrappers, bags)', isLowWaste: false },
  { id: 'PLASTIC_RIGID_OTHER', label: 'Plastic - Rigid, Other (Types #3, #4, #5, #6, #7)', isLowWaste: false },
  { id: 'PLASTIC_COATED_PAPER', label: 'Plastic-Coated Paper (e.g., some coffee cups, Tetra Paks)', isLowWaste: false },
  { id: 'FOAM', label: 'Foam (e.g., Styrofoam, EPS trays)', isLowWaste: false },
  { id: 'WAXED_PAPER_CARDBOARD', label: 'Waxed Paper/Cardboard (e.g., some food wraps, butcher paper)', isLowWaste: false },
  { id: 'FLEXIBLE_LAMINATE_POUCH', label: 'Flexible Laminate Pouch (e.g., tuna, baby food, juice pouches)', isLowWaste: false },
  { id: 'MIXED_MATERIALS', label: 'Mixed Materials (e.g., crisp bags with foil lining)', isLowWaste: false },
  { id: 'OTHER_UNKNOWN', label: 'Other/Unknown', isLowWaste: false },
];

interface PackagingLog {
  id: string;
  created_at: string;
  food_item_name: string;
  packaging_type: string;
  is_low_waste: boolean;
  quantity: number;
  notes?: string;
  photo_url_new_item?: string;
  made_switch?: boolean;
  previous_item_description?: string;
  photo_url_old_item?: string;
  previous_packaging_type?: string;
  image_url?: string | null;
}

// --- START ADDITION: Interface for Packaging Swap Summary ---
interface PackagingSwapSummary {
  date: string;
  totalSwapsMade: number;      // Count of logs with made_switch = true for that day
  lowWasteChoices: number;     // Count of logs with is_low_waste = true for that day
  totalChoicesLogged: number;  // Total logs for that day
  lowWastePercentage: number;  // (lowWasteChoices / totalChoicesLogged) * 100 for that day
  // Potentially add counts for specific packaging types swapped from/to if needed for detailed charts
}
// --- END ADDITION ---

// Interface for AI-generated packaging alternatives
interface PackagingAlternative {
  id: string;
  foodItem: string;
  currentPackaging: string;
  suggestedAlternative: string;
  reasoning: string;
  impactReduction: string;
  whereToFind: string;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
}

// Interface for AI-generated sustainability insights
interface SustainabilityInsight {
  id: string;
  type: 'environmental_impact' | 'improvement_suggestion' | 'achievement' | 'challenge';
  title: string;
  description: string;
  actionItems?: string[];
}

// Helper function to fetch food image from Spoonacular API
const fetchFoodImageFromName = async (name: string): Promise<string | null> => {
  if (!SPOONACULAR_API_KEY) {
    console.warn("Spoonacular API key not set");
    return null;
  }
  
  // Basic normalization: trim and take first few words if very long
  const searchTerm = name.trim().toLowerCase();
  const query = encodeURIComponent(searchTerm.split(' ').slice(0, 3).join(' ')); // Use first 3 words for search
  
  try {
    console.log(`Fetching image for: "${searchTerm}" (query: "${query}")`);
    const response = await fetch(
      `https://api.spoonacular.com/food/ingredients/search?query=${query}&number=1&apiKey=${SPOONACULAR_API_KEY}`
    );
    
    if (!response.ok) {
      console.error("Spoonacular API error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return null;
    }
    
    const data = await response.json();
    console.log("Spoonacular API response:", data);
    
    if (data.results && data.results.length > 0 && data.results[0].image) {
      const imageUrl = SPOONACULAR_IMAGE_BASE_URL + data.results[0].image;
      console.log("Generated image URL:", imageUrl);
      return imageUrl;
    } else {
      console.log("No image found in API response for:", searchTerm);
      return null;
    }
  } catch (error) {
    console.error("Error fetching image from Spoonacular:", error);
    return null;
  }
};

const PackagingSwapPage = () => {
  const { user } = useAuthContext();
  const [foodItemName, setFoodItemName] = useState('');
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [customPackagingType, setCustomPackagingType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLogs, setUserLogs] = useState<PackagingLog[]>([]);
  const [selectedPurchaseDate, setSelectedPurchaseDate] = useState<Date | undefined>(new Date());
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLogItem, setEditingLogItem] = useState<PackagingLog | null>(null);
  const [editFoodItemName, setEditFoodItemName] = useState('');
  const [editSelectedPackaging, setEditSelectedPackaging] = useState('');
  const [editCustomPackagingType, setEditCustomPackagingType] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // --- START ADDITION: State for chart data ---
  const [packagingSummaryData, setPackagingSummaryData] = useState<PackagingSwapSummary[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState<'week' | 'month' | '3months' | 'year'>('month');
  // --- END ADDITION ---

  // State for day-based filtering in logged items
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // AI-related state variables
  const [packagingAlternatives, setPackagingAlternatives] = useState<PackagingAlternative[]>([]);
  const [sustainabilityInsights, setSustainabilityInsights] = useState<SustainabilityInsight[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [selectedHighWasteItems, setSelectedHighWasteItems] = useState<PackagingLog[]>([]);

  // Calculate scoreboard stats
  const scoreboardStats = React.useMemo(() => {
    const totalItems = userLogs.length;
    const lowWasteItems = userLogs.filter(log => log.is_low_waste).length;
    const highWasteItems = totalItems - lowWasteItems;
    const lowWastePercentage = totalItems > 0 ? Math.round((lowWasteItems / totalItems) * 100) : 0;
    return { totalItems, lowWasteItems, highWasteItems, lowWastePercentage };
  }, [userLogs]);

  // TODO: Fetch existing logs for the user
  useEffect(() => {
    fetchUserLogs();
  }, [user]);

  // Check for Spoonacular API key on component mount
  useEffect(() => {
    // Debug environment variables (helpful for troubleshooting deployment)
    debugEnvironmentVariables();
    
    if (!SPOONACULAR_API_KEY) {
      console.warn("Spoonacular API key is not set. Image fetching will be disabled.");
      toast.warning("Image fetching disabled: Spoonacular API key missing.", {
        description: "Please set VITE_SPOONACULAR_API_KEY in your .env file."
      });
    }
    if (!ANTHROPIC_API_KEY) {
      console.warn("Anthropic API key is not set. AI features will be disabled.");
      toast.warning("AI features disabled: Anthropic API key missing.", {
        description: "Please set VITE_ANTHROPIC_KEY in your .env file."
      });
    }
  }, []);

  // --- START ADDITION: useEffect to generate summary data when userLogs change ---
  useEffect(() => {
    if (userLogs.length > 0) {
      generatePackagingSwapSummaryData(userLogs);
    } else {
      setPackagingSummaryData([]); // Clear summary if no logs
    }
  }, [userLogs]);
  // --- END ADDITION ---

  const fetchUserLogs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Use `as any` to bypass current Supabase client type limitations for this new table
      const { data, error } = await (supabase.from('packaging_logs') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserLogs((data as PackagingLog[]) || []); // Cast data to PackagingLog[]
    } catch (error) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching logs';
      toast.error('Failed to fetch your packaging logs.', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- START ADDITION: Function to generate summary data for charts ---
  const generatePackagingSwapSummaryData = (logs: PackagingLog[]) => {
    const dailyData: Record<string, { 
      swapsMade: number;
      lowWasteItems: number;
      totalItems: number;
    }> = {};

    logs.forEach(log => {
      // Extract date directly from the stored string to avoid timezone conversion
      const rawDate = log.created_at.split('T')[0]; // Get YYYY-MM-DD directly
      
      // Hard code fix: Add one day to correct the graph display
      const logDate = new Date(rawDate + 'T00:00:00');
      logDate.setDate(logDate.getDate() + 1);
      const date = logDate.toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = { swapsMade: 0, lowWasteItems: 0, totalItems: 0 };
      }

      dailyData[date].totalItems++;
      if (log.is_low_waste) {
        dailyData[date].lowWasteItems++;
      }
      
      // Only count sustainable switches (high-waste to low-waste)
      if (log.made_switch && log.previous_packaging_type) {
        // Find the previous packaging type info to determine if it was high-waste
        const previousPackagingInfo = packagingTypes.find(p => p.id === log.previous_packaging_type);
        
        // If we found the previous packaging info, check if this was a sustainable switch
        if (previousPackagingInfo) {
          // Sustainable switch: previous was high-waste, current is low-waste
          if (!previousPackagingInfo.isLowWaste && log.is_low_waste) {
            dailyData[date].swapsMade++;
          }
        } else {
          // For custom packaging types, we can't determine the previous waste level
          // So we conservatively don't count it as a sustainable switch
        }
      }
    });

    const summary: PackagingSwapSummary[] = Object.entries(dailyData).map(([date, data]) => ({
      date,
      totalSwapsMade: data.swapsMade,
      lowWasteChoices: data.lowWasteItems,
      totalChoicesLogged: data.totalItems,
      lowWastePercentage: data.totalItems > 0 ? Math.round((data.lowWasteItems / data.totalItems) * 100) : 0,
    }));

    summary.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
    setPackagingSummaryData(summary);
  };
  // --- END ADDITION ---

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormErrors([]);
    const errors: string[] = [];

    const currentQuantity = parseInt(quantity, 10);
    if (isNaN(currentQuantity) || currentQuantity < 1) {
      errors.push('Quantity must be a whole number greater than 0.');
    }

    if (!user) {
      errors.push('You must be logged in to submit a log.');
    }

    if (!foodItemName) {
      errors.push('Please enter a food item name.');
    }

    if (!selectedPackaging) {
      errors.push('Please select a packaging type.');
    }

    if (selectedPackaging === 'OTHER_UNKNOWN' && !customPackagingType.trim()) {
      errors.push('Please specify the custom packaging type.');
    }

    if (!selectedPurchaseDate) {
      errors.push('Please choose a purchase date.');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Determine the packaging type to save
    const packagingTypeToSave = selectedPackaging === 'OTHER_UNKNOWN' ? customPackagingType.trim() : selectedPackaging;
    const packagingDetail = packagingTypes.find(p => p.id === selectedPackaging);
    if (!packagingDetail) {
        setFormErrors(['Invalid packaging type selected.']);
        return;
    }

    setIsLoading(true);
    try {
      // Fix timezone issue: Create proper date string that preserves the selected date
      const now = new Date();
      const year = selectedPurchaseDate.getFullYear();
      const month = (selectedPurchaseDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedPurchaseDate.getDate().toString().padStart(2, '0');
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const millis = now.getMilliseconds().toString().padStart(3, '0');
      
      // Create ISO string that preserves the selected date regardless of timezone
      const purchaseDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}Z`;

      // Use `as any` for insert operation as well
      const { data, error } = await (supabase.from('packaging_logs') as any)
        .insert([{ 
          user_id: user.id, 
          food_item_name: foodItemName,
          packaging_type: packagingTypeToSave,
          is_low_waste: packagingDetail.isLowWaste,
          quantity: currentQuantity,
          notes: notes || null,
          created_at: purchaseDateStr,
        }])
        .select(); // Ensure .select() is called to get the inserted data back

      if (error) throw error;
      
      if (data && data.length > 0) {
        const newLog = data[0] as PackagingLog;
        
        // Fetch and save food image
        let addedItemData = newLog;
        const imageUrl = await fetchFoodImageFromName(foodItemName);
        console.log(`Image URL fetch result for "${foodItemName}":`, imageUrl);
        
        if (imageUrl && newLog.id) {
          try {
            const { data: updatedData, error: updateError } = await (supabase.from('packaging_logs') as any)
              .update({ image_url: imageUrl })
              .eq('id', newLog.id)
              .select()
              .single();
            
            if (updateError) {
              console.error("Database update error for image_url:", updateError);
              // Check if it's a column not found error
              if (updateError.message && updateError.message.includes('image_url')) {
                console.warn("The image_url column doesn't exist in the packaging_logs table. Skipping image update.");
                toast.warning("Image storage not available", { 
                  description: "Images are being fetched but not stored. Please check database schema." 
                });
              } else {
                toast.error("Failed to save image URL.", { description: updateError.message });
              }
            } else if (updatedData) {
              addedItemData = updatedData as PackagingLog; // Use the fully updated item
              console.log(`Successfully updated item with image URL:`, addedItemData);
              toast.info(`Image found for "${addedItemData.food_item_name}"!`);
            }
          } catch (dbError) {
            console.error("Database error when updating image_url:", dbError);
            toast.warning("Could not save image to database", { 
              description: "Image was fetched but couldn't be stored." 
            });
          }
        } else {
          console.log(`No image URL to save for "${foodItemName}". URL: ${imageUrl}, ID: ${newLog.id}`);
          toast.info(`No image found for "${addedItemData.food_item_name}", or API key missing.`);
        }
        
        // Automatically detect switch type based on previous logs
        const previousLog = getPreviousLogForFoodItem(addedItemData.food_item_name, addedItemData.id, addedItemData.created_at);
        const switchDetection = detectSwitchType(packagingTypeToSave, packagingDetail.isLowWaste, previousLog);
        
        // Update the log with switch information if a switch was detected
        if (switchDetection.madeSwitch) {
          const { error: updateError } = await (supabase.from('packaging_logs') as any)
            .update({
              made_switch: true,
              previous_packaging_type: switchDetection.previousPackagingType,
            })
            .eq('id', addedItemData.id)
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('Error updating switch information:', updateError);
          } else {
            // Update local state with switch information
            addedItemData.made_switch = true;
            addedItemData.previous_packaging_type = switchDetection.previousPackagingType;
          }
        }
        
        setUserLogs(prevLogs => [addedItemData, ...prevLogs]);
        
        // Show dynamic feedback for new log
        showDynamicFeedback(addedItemData, previousLog, switchDetection.switchType);
      }
      toast.success('Packaging log submitted!');
      setFoodItemName('');
      setSelectedPackaging('');
      setCustomPackagingType('');
      setQuantity('1');
      setNotes('');
      setSelectedPurchaseDate(new Date()); // Reset to today
      setFormErrors([]); // Clear any errors
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error submitting log';
      setFormErrors([`Failed to submit log: ${errorMessage}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditModal = (logItem: PackagingLog) => {
    setEditingLogItem(logItem);
    setEditFoodItemName(logItem.food_item_name);
    
    // Check if the current packaging type is a custom one (not in predefined types)
    const predefinedType = packagingTypes.find(p => p.id === logItem.packaging_type);
    if (predefinedType) {
      setEditSelectedPackaging(logItem.packaging_type);
      setEditCustomPackagingType('');
    } else {
      // Custom packaging type - set to OTHER_UNKNOWN and store custom value
      setEditSelectedPackaging('OTHER_UNKNOWN');
      setEditCustomPackagingType(logItem.packaging_type);
    }
    
    setEditQuantity(logItem.quantity.toString());
    setEditNotes(logItem.notes || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingLogItem(null);
    setEditFoodItemName('');
    setEditSelectedPackaging('');
    setEditCustomPackagingType('');
    setEditQuantity('1');
    setEditNotes('');
    setIsSubmittingEdit(false);
  };

  const handleEditSubmit = async () => {
    if (!editingLogItem || !user) {
      toast.error('Cannot save edit: No item selected or user not found.');
      return;
    }

    const currentEditQuantity = parseInt(editQuantity, 10);
    if (isNaN(currentEditQuantity) || currentEditQuantity < 1) {
      toast.error('Quantity must be a whole number greater than 0.');
      return;
    }

    if (!editFoodItemName || !editSelectedPackaging) {
      toast.warning('Food item name and packaging type are required.');
      return;
    }

    if (editSelectedPackaging === 'OTHER_UNKNOWN' && !editCustomPackagingType.trim()) {
      toast.error('Please specify the custom packaging type.');
      return;
    }

    // Determine the packaging type to save
    const packagingTypeToSave = editSelectedPackaging === 'OTHER_UNKNOWN' ? editCustomPackagingType.trim() : editSelectedPackaging;
    const packagingDetail = packagingTypes.find(p => p.id === editSelectedPackaging);
    if (!packagingDetail) {
        toast.error('Invalid packaging type selected for edit.');
        return;
    }

    setIsSubmittingEdit(true);
    try {
      // For edits, we need to calculate switch information based on the relationship 
      // to the previous separate log entry, not the original values of the same entry
      const previousLogForEditedItem = getPreviousLogForFoodItem(editFoodItemName, editingLogItem.id, editingLogItem.created_at);
      const editSwitchDetection = detectSwitchType(packagingTypeToSave, packagingDetail.isLowWaste, previousLogForEditedItem);

      const updatedLogData: Partial<PackagingLog> = {
        food_item_name: editFoodItemName,
        packaging_type: packagingTypeToSave,
        is_low_waste: packagingDetail.isLowWaste,
        quantity: currentEditQuantity,
        notes: editNotes || null,
        // Use the switch detection based on relationship to previous separate log entry
        made_switch: editSwitchDetection.madeSwitch,
        previous_packaging_type: editSwitchDetection.previousPackagingType,
        // Clear previous_item_description since we're recalculating switch status
        previous_item_description: null,
      };

      // Remove undefined fields to avoid sending them in update
      Object.keys(updatedLogData).forEach(key => 
        (updatedLogData as any)[key] === undefined && delete (updatedLogData as any)[key]
      );

      const { data, error } = await (supabase.from('packaging_logs') as any)
        .update(updatedLogData)
        .eq('id', editingLogItem.id)
        .eq('user_id', user.id); // REMOVE .select() from the original call

      if (error) throw error;

      // If no error, assume update was successful. 
      // Construct the updated log item for local state and feedback as data will be null.
      const locallyUpdatedLog = { 
        ...editingLogItem, 
        ...updatedLogData 
      } as PackagingLog;

      setUserLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === editingLogItem.id ? locallyUpdatedLog : log
        )
      );
      toast.success('Log entry updated successfully!');
      
      // Show feedback based on the switch detection
      if (previousLogForEditedItem) {
        showDynamicFeedback(locallyUpdatedLog, previousLogForEditedItem, editSwitchDetection.switchType);
      } else {
        // No previous log entry for this food item, treat as first-time logging
        showDynamicFeedback(locallyUpdatedLog, null, 'none');
      }
      
      closeEditModal();

    } catch (error) {
      console.error('Supabase update error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating log';
      toast.error('Failed to update log.', { description: errorMessage });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- START ADDITION: Delete Log Functionality ---
  const handleDeleteLog = async (logId: string, foodItemName: string) => {
    if (!user) {
      toast.error('User not found. Cannot delete.');
      return;
    }

    // Simple confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the log for "${foodItemName}"?`)) {
      return;
    }

    setIsLoading(true); // Reuse isLoading or add a specific deleting state if preferred
    try {
      const { error } = await (supabase.from('packaging_logs') as any)
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id); // Ensure user can only delete their own logs

      if (error) throw error;

      setUserLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
      toast.success(`Log for "${foodItemName}" deleted successfully.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting log';
      toast.error('Failed to delete log.', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  // --- END ADDITION ---

  // Helper function to find the most recent previous log for a given food item
  const getPreviousLogForFoodItem = (foodName: string, currentLogIdToExclude?: string, currentLogDate?: string): PackagingLog | null => {
    const relevantLogs = userLogs
      .filter(log => log.food_item_name.toLowerCase() === foodName.toLowerCase() && log.id !== currentLogIdToExclude)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by newest first

    if (!currentLogDate) return relevantLogs.length > 0 ? relevantLogs[0] : null;

    // Extract dates directly from stored strings to avoid timezone conversion
    const currentDateOnly = currentLogDate.split('T')[0]; // Get YYYY-MM-DD
    const previousLogs = relevantLogs.filter(log => {
      const logDateOnly = log.created_at.split('T')[0]; // Get YYYY-MM-DD
      return logDateOnly < currentDateOnly;
    });
    
    return previousLogs.length > 0 ? previousLogs[0] : null;
  };

  // Helper function to automatically detect switch type
  const detectSwitchType = (currentPackagingType: string, currentIsLowWaste: boolean, previousLog: PackagingLog | null): {
    madeSwitch: boolean;
    previousPackagingType: string | null;
    switchType: 'sustainable' | 'unsustainable' | 'same_waste_level' | 'none';
  } => {
    if (!previousLog) {
      return {
        madeSwitch: false,
        previousPackagingType: null,
        switchType: 'none'
      };
    }

    const previousPackagingType = previousLog.packaging_type;
    const previousIsLowWaste = previousLog.is_low_waste;

    // If packaging type is exactly the same, no switch was made
    if (currentPackagingType === previousPackagingType) {
      return {
        madeSwitch: false,
        previousPackagingType: null,
        switchType: 'none'
      };
    }

    // Different packaging types, so a switch was made
    if (currentIsLowWaste && !previousIsLowWaste) {
      // Switched from high-waste to low-waste = sustainable switch
      return {
        madeSwitch: true,
        previousPackagingType: previousPackagingType,
        switchType: 'sustainable'
      };
    } else if (!currentIsLowWaste && previousIsLowWaste) {
      // Switched from low-waste to high-waste = unsustainable switch
      return {
        madeSwitch: true,
        previousPackagingType: previousPackagingType,
        switchType: 'unsustainable'
      };
    } else {
      // Both are same waste level but different packaging types
      return {
        madeSwitch: true,
        previousPackagingType: previousPackagingType,
        switchType: 'same_waste_level'
      };
    }
  };

  // --- START ADDITION: Helper function for switch notification message ---
  const getSwitchNotificationMessage = (log: PackagingLog): { message: string, type: 'positive' | 'negative' | 'neutral' | 'none' } => {
    if (!log.made_switch || !log.previous_packaging_type) {
      return { message: '', type: 'none' };
    }

    const currentPackagingInfo = packagingTypes.find(p => p.id === log.packaging_type);
    const previousPackagingInfo = packagingTypes.find(p => p.id === log.previous_packaging_type);

    if (!currentPackagingInfo || !previousPackagingInfo) {
      // Should not happen if data is consistent
      return { message: 'Packaging info incomplete for switch.', type: 'neutral' };
    }

    const currentLabel = currentPackagingInfo.label;
    const previousLabel = previousPackagingInfo.label;

    if (currentPackagingInfo.isLowWaste && !previousPackagingInfo.isLowWaste) {
      return { message: `Sustainable Switch! From ${previousLabel} to ${currentLabel}.`, type: 'positive' };
    } else if (!currentPackagingInfo.isLowWaste && previousPackagingInfo.isLowWaste) {
      return { message: `Unsustainable Switch: From ${previousLabel} (low waste) to ${currentLabel}.`, type: 'negative' };
    } else if (currentPackagingInfo.isLowWaste && previousPackagingInfo.isLowWaste) {
      return { message: `Packaging Changed (still low waste): From ${previousLabel} to ${currentLabel}.`, type: 'neutral' };
    } else { // Both high waste, but different
      return { message: `Packaging Changed: From ${previousLabel} to ${currentLabel}. (Both high waste)`, type: 'neutral' };
    }
  };
  // --- END ADDITION ---

  const showDynamicFeedback = (currentLog: PackagingLog, previousLog: PackagingLog | null, switchType: 'sustainable' | 'unsustainable' | 'same_waste_level' | 'none') => {
    const currentPackagingInfo = packagingTypes.find(p => p.id === currentLog.packaging_type);
    if (!currentPackagingInfo) return; // Should not happen if validation is correct

    if (previousLog) {
      const previousPackagingInfo = packagingTypes.find(p => p.id === previousLog.packaging_type);
      if (!previousPackagingInfo) return;

      switch (switchType) {
        case 'none':
          // Same packaging type as before
          if (!currentPackagingInfo.isLowWaste) {
            toast.info(
              `You previously logged "${currentLog.food_item_name}" with the same packaging.`, 
              {
                description: `Consider looking for options with less waste! You noted: "${previousLog.notes || 'No notes'}" last time. Check local stores or farmer's markets.`,
                duration: 8000,
              }
            );
          } else {
            toast.success(
              `Consistent low-waste choice for "${currentLog.food_item_name}"! Great job! `,
              {
                description: `You previously used ${previousPackagingInfo.label} and stuck with a good option!`,
                duration: 6000,
              }
            );
          }
          break;
          
        case 'sustainable':
          // Switched from high-waste to low-waste
          toast.success(
            `🎉 Fantastic sustainable switch for "${currentLog.food_item_name}"!`,
            {
              description: `You switched from ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. That's a great improvement for the environment!`,
              duration: 8000,
            }
          );
          break;
          
        case 'unsustainable':
          // Switched from low-waste to high-waste
          toast.warning(
            `"${currentLog.food_item_name}" packaging choice changed.`, 
            {
              description: `You previously used ${previousPackagingInfo.label} (low waste), but now logged ${currentPackagingInfo.label}. Try to stick to low-waste options when possible!`,
              duration: 8000,
            }
          );
          break;
          
        case 'same_waste_level':
          // Different packaging but same waste level
          if (currentPackagingInfo.isLowWaste) {
            toast.info(
              `"${currentLog.food_item_name}" packaging changed, but still low waste.`,
              {
                description: `From ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. Keep up the good work choosing sustainable options!`,
                duration: 7000,
              }
            );
          } else {
            toast.info(
              `Packaging for "${currentLog.food_item_name}" changed.`, 
              {
                description: `From ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. Consider exploring low-waste alternatives!`,
                duration: 7000,
              }
            );
          }
          break;
      }
    } else {
      // First time logging this item
      if (currentPackagingInfo.isLowWaste) {
        toast.success(
          `Great start with "${currentLog.food_item_name}"! `,
          { description: `Choosing ${currentPackagingInfo.label} is a fantastic low-waste option.`, duration: 6000 }
        );
      } else {
        toast.info(
          `You logged "${currentLog.food_item_name}" with ${currentPackagingInfo.label}.`, 
          { description: 'For future purchases, see if you can find a lower-waste packaging option!', duration: 7000 }
        );
      }
    }
  };

  // --- START ADDITION: Helper function to get today's date in YYYY-MM-DD format ---
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // --- START ADDITION: Helper function to get today's summary ---
  const getTodaysSummary = (summaryData: PackagingSwapSummary[]): PackagingSwapSummary | null => {
    const todayStr = getTodayDateString();
    return summaryData.find(s => s.date === todayStr) || null;
  };

  // --- START ADDITION: Helper function to calculate average low-waste percentage for the last N days ---
  const getAverageLowWasteLastNDays = (summaryData: PackagingSwapSummary[], numDays: number): number | null => {
    const todayStr = getTodayDateString();
    const pastData = summaryData.filter(s => s.date < todayStr);
    const recentData = pastData.slice(-numDays);
    if (recentData.length === 0) return null;
    const totalPercentage = recentData.reduce((sum, s) => sum + s.lowWastePercentage, 0);
    return totalPercentage / recentData.length;
  };

  // --- START ADDITION: Generate insights and tips based on packaging data ---
  const generatePackagingInsightsAndTips = (summaryData: PackagingSwapSummary[], logs: PackagingLog[]) => {
    const insights: { message: string; type: 'tip' | 'encouragement' | 'warning' | 'achievement' }[] = [];
    const todaySummary = getTodaysSummary(summaryData);
    const avgLowWasteLast7Days = getAverageLowWasteLastNDays(summaryData, 7);
    const totalSwapsMade = logs.filter(log => log.made_switch).length;
    
    // Basic insights based on total data
    if (totalSwapsMade > 0) {
      insights.push({ 
        message: `You've made ${totalSwapsMade} sustainable packaging swap${totalSwapsMade === 1 ? '' : 's'} so far!`, 
        type: 'achievement' 
      });
    }

    // Today's insights
    if (todaySummary) {
      if (todaySummary.lowWastePercentage === 100 && todaySummary.totalChoicesLogged > 1) {
        insights.push({ 
          message: `Perfect day! All ${todaySummary.totalChoicesLogged} items you logged today used low-waste packaging.`, 
          type: 'encouragement' 
        });
      } else if (todaySummary.lowWastePercentage > 75) {
        insights.push({ 
          message: `Great job today! ${todaySummary.lowWastePercentage}% of your choices used low-waste packaging.`, 
          type: 'encouragement' 
        });
      } else if (todaySummary.lowWastePercentage > 50) {
        insights.push({ 
          message: `Good progress today with ${todaySummary.lowWastePercentage}% low-waste choices.`, 
          type: 'encouragement' 
        });
      } else if (todaySummary.totalChoicesLogged > 0) {
        insights.push({ 
          message: `Only ${todaySummary.lowWastePercentage}% of today's choices were low-waste. Keep looking for better options!`, 
          type: 'warning' 
        });
      }
    }

    // Trend insights
    if (avgLowWasteLast7Days !== null && todaySummary) {
      if (todaySummary.lowWastePercentage > avgLowWasteLast7Days + 10) {
        insights.push({ 
          message: `You're doing better than your 7-day average! Keep up the momentum.`, 
          type: 'encouragement' 
        });
      } else if (todaySummary.lowWastePercentage < avgLowWasteLast7Days - 10 && todaySummary.totalChoicesLogged > 0) {
        insights.push({ 
          message: `Today's choices (${todaySummary.lowWastePercentage}% low-waste) are below your 7-day average (${Math.round(avgLowWasteLast7Days)}%).`, 
          type: 'warning' 
        });
      }
    }

    // Tips based on data patterns
    const highWasteItems = logs.filter(log => !log.is_low_waste);
    if (highWasteItems.length > 0) {
      // Find most common high-waste packaging type
      const packagingCounts: Record<string, number> = {};
      highWasteItems.forEach(item => {
        const packagingType = item.packaging_type;
        packagingCounts[packagingType] = (packagingCounts[packagingType] || 0) + 1;
      });
      
      let mostCommonHighWasteType = '';
      let highestCount = 0;
      Object.entries(packagingCounts).forEach(([type, count]) => {
        if (count > highestCount) {
          mostCommonHighWasteType = type;
          highestCount = count;
        }
      });
      
      if (mostCommonHighWasteType) {
        const packagingInfo = packagingTypes.find(p => p.id === mostCommonHighWasteType);
        if (packagingInfo) {
          insights.push({ 
            message: `Tip: Look for alternatives to ${packagingInfo.label.toLowerCase()}, which appears in ${highestCount} of your logs.`, 
            type: 'tip' 
          });
        }
      }
    }

    // Add general tips if few insights
    if (insights.length < 2) {
      insights.push({ 
        message: `Tip: Try buying in bulk with your own containers to reduce packaging waste.`, 
        type: 'tip' 
      });
      insights.push({ 
        message: `Tip: Look for items packaged in glass, paper, or metal instead of plastic when possible.`, 
        type: 'tip' 
      });
    }

    return insights;
  };
  // --- END ADDITION ---

  // --- START ADDITION: Helper function to filter data by time range ---
  const filterDataByTimeRange = (data: PackagingSwapSummary[], timeRange: 'week' | 'month' | '3months' | 'year') => {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    return data.filter(item => item.date >= cutoffDateStr);
  };

  // Memoized filtered data
  const filteredChartData = React.useMemo(() => {
    return filterDataByTimeRange(packagingSummaryData, chartTimeRange);
  }, [packagingSummaryData, chartTimeRange]);

  // Helper function to group items by day
  const groupItemsByDay = React.useMemo(() => {
    const groups: Record<string, PackagingLog[]> = {};
    
    userLogs.forEach(log => {
      const dateKey = log.created_at.split('T')[0]; // Extract YYYY-MM-DD directly
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    // Convert to array and sort by date (newest first)
    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        displayDate: new Date(date + 'T00:00:00').toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        items: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort items within day by time
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort days newest first
  }, [userLogs]);

  // Toggle collapsed state for a specific day
  const toggleDayCollapsed = (dateKey: string) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // AI-powered packaging alternatives generator
  const generatePackagingAlternatives = async (highWasteItems: PackagingLog[]) => {
    if (!ANTHROPIC_API_KEY) {
      toast.error("AI features disabled: Anthropic API key missing.");
      return;
    }

    if (highWasteItems.length === 0) {
      toast.info("No high-waste items found to suggest alternatives for.");
      return;
    }

    setIsGeneratingAlternatives(true);
    
    const itemsDescription = highWasteItems.map(item => 
      `${item.food_item_name} (currently packaged in: ${packagingTypes.find(p => p.id === item.packaging_type)?.label || item.packaging_type})`
    ).join(', ');

    const prompt = `
You are a sustainability expert helping users reduce packaging waste. Given these food items with high-waste packaging:

${itemsDescription}

For each item, suggest better packaging alternatives following this JSON format:
{
  "alternatives": [
    {
      "foodItem": "Item name",
      "currentPackaging": "Current packaging type",
      "suggestedAlternative": "Better packaging option",
      "reasoning": "Why this alternative is better (brief)",
      "impactReduction": "Environmental benefit (e.g., '70% less plastic waste')",
      "whereToFind": "Where to find this alternative (specific stores/brands if possible)",
      "difficultyLevel": "Easy/Medium/Hard"
    }
  ]
}

Focus on practical, realistic alternatives available in most areas. Consider bulk stores, farmer's markets, specific brands, or different store sections.
    `.trim();

    try {
      // Debug API call
      console.log('=== API Call Debug ===');
      console.log('API URL:', ANTHROPIC_API_URL);
      console.log('API Key available:', !!ANTHROPIC_API_KEY);
      console.log('API Key length:', ANTHROPIC_API_KEY?.length);
      
      const response = await fetch(ANTHROPIC_API_URL, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Cheapest Claude model
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            { 
              role: 'user', 
              content: prompt 
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Anthropic API Error:", errorData);
        let errorMessage = `API request failed with status ${response.status}`;
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.content && data.content.length > 0 && data.content[0].text) {
        const content = data.content[0].text;
        
        if (content) {
          try {
            const parsedContent = JSON.parse(content);
            if (parsedContent.alternatives && Array.isArray(parsedContent.alternatives)) {
              const alternatives: PackagingAlternative[] = parsedContent.alternatives.map((alt: any, index: number) => ({
                id: `alt-${Date.now()}-${index}`,
                ...alt
              }));
              
              setPackagingAlternatives(alternatives);
              toast.success(`Generated ${alternatives.length} packaging alternative${alternatives.length !== 1 ? 's' : ''}!`);
            } else {
              throw new Error('Invalid response format: missing alternatives array');
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Raw response content:', content);
            toast.error('Failed to parse AI response. Please try again.');
          }
        } else {
          toast.info("AI couldn't generate alternatives this time. Try again later.");
        }
      } else {
        toast.info("AI couldn't generate alternatives this time. Try again later.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error('Error generating alternatives:', error);
      toast.error('Failed to generate packaging alternatives.', { description: errorMessage });
    } finally {
      setIsGeneratingAlternatives(false);
    }
  };

  // AI-powered sustainability insights generator  
  const generateSustainabilityInsights = async () => {
    if (!ANTHROPIC_API_KEY) {
      toast.error("AI features disabled: Anthropic API key missing.");
      return;
    }

    setIsGeneratingInsights(true);

    const recentLogs = userLogs.slice(0, 20); // Use last 20 items for analysis
    
    // Add validation for empty logs
    if (recentLogs.length === 0) {
      toast.info("No packaging logs found to analyze. Add some purchases first!");
      setIsGeneratingInsights(false);
      return;
    }

    const stats = {
      totalItems: recentLogs.length,
      lowWasteItems: recentLogs.filter(log => log.is_low_waste).length,
      sustainableSwitches: recentLogs.filter(log => log.made_switch && log.is_low_waste).length,
      commonHighWastePackaging: [...new Set(recentLogs.filter(log => !log.is_low_waste).map(log => log.packaging_type))],
      mostLoggedFoods: recentLogs.reduce((acc, log) => {
        acc[log.food_item_name] = (acc[log.food_item_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    const prompt = `
You are a sustainability coach analyzing packaging choices. Based on these user stats:

- Total recent purchases: ${stats.totalItems}
- Low-waste choices: ${stats.lowWasteItems}/${stats.totalItems} (${stats.totalItems > 0 ? Math.round((stats.lowWasteItems/stats.totalItems) * 100) : 0}%)
- Sustainable switches made: ${stats.sustainableSwitches}
- Common high-waste packaging: ${stats.commonHighWastePackaging.join(', ') || 'None'}
- Frequently bought items: ${Object.entries(stats.mostLoggedFoods).slice(0, 5).map(([food, count]) => `${food} (${count}x)`).join(', ') || 'None'}

Generate 3-4 personalized sustainability insights following this JSON format:
{
  "insights": [
    {
      "type": "environmental_impact/improvement_suggestion/achievement/challenge",
      "title": "Insight title",
      "description": "Detailed description with specific data",
      "actionItems": ["Specific action 1", "Specific action 2"]
    }
  ]
}

Focus on:
1. Environmental impact calculations
2. Specific improvement suggestions  
3. Celebrating achievements
4. Personalized challenges
    `.trim();

    try {
      const response = await fetch(ANTHROPIC_API_URL, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Cheapest Claude model
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            { 
              role: 'user', 
              content: prompt 
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Anthropic API Error:", errorData);
        let errorMessage = `API request failed with status ${response.status}`;
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.content && data.content.length > 0 && data.content[0].text) {
        const content = data.content[0].text;
        
        if (content) {
          try {
            const parsedContent = JSON.parse(content);
            if (parsedContent.insights && Array.isArray(parsedContent.insights)) {
              const insights: SustainabilityInsight[] = parsedContent.insights.map((insight: any, index: number) => ({
                id: `insight-${Date.now()}-${index}`,
                ...insight
              }));
              
              setSustainabilityInsights(insights);
              toast.success(`Generated ${insights.length} sustainability insight${insights.length !== 1 ? 's' : ''}!`);
            } else {
              throw new Error('Invalid response format: missing insights array');
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Raw response content:', content);
            toast.error('Failed to parse AI response. Please try again.');
          }
        } else {
          toast.info("AI couldn't generate insights this time. Try again later.");
        }
      } else {
        toast.info("AI couldn't generate insights this time. Try again later.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error('Error generating insights:', error);
      toast.error('Failed to generate sustainability insights.', { description: errorMessage });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Open AI modal with alternatives for high-waste items
  const handleOpenAIModal = () => {
    const highWasteItems = userLogs.filter(log => !log.is_low_waste).slice(0, 10); // Last 10 high-waste items
    setSelectedHighWasteItems(highWasteItems);
    setIsAIModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sustainable Packaging Swapper</h1>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <p className="text-gray-600 mb-6">
        Try to buy foods with low-waste packaging. Log your purchases below.
      </p>

      {/* Two-column layout: Log section on left, Progress on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Log New Purchase */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-green-600" />
                Log New Purchase
              </CardTitle>
              <CardDescription>Record a food item and its packaging type to track your sustainable choices.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitLog} className="space-y-4">
                {/* Display form errors */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-red-800 text-sm space-y-1">
                      {formErrors.map((error, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-red-600 mr-2">•</span>
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!selectedPurchaseDate && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedPurchaseDate ? format(selectedPurchaseDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedPurchaseDate}
                        onSelect={setSelectedPurchaseDate}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select when you made this purchase.
                  </p>
                </div>
                <div>
                  <Label htmlFor="foodItemName">Food Item Name</Label>
                  <Input 
                    id="foodItemName" 
                    value={foodItemName} 
                    onChange={(e) => setFoodItemName(e.target.value)} 
                    placeholder="e.g., Apples, Oats, Bread" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="packagingType">Packaging Type</Label>
                  <Select onValueChange={(value) => {
                    setSelectedPackaging(value);
                    if (value !== 'OTHER_UNKNOWN') {
                      setCustomPackagingType('');
                    }
                  }} value={selectedPackaging} required>
                    <SelectTrigger id="packagingType">
                      <SelectValue placeholder="Select packaging type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packagingTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <span className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${type.isLowWaste ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {type.label}
                            <span className={`text-xs px-1 py-0.5 rounded ${type.isLowWaste ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {type.isLowWaste ? 'Low Waste' : 'High Waste'}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the packaging type that best describes your item. Green indicates low-waste options.
                  </p>
                </div>
                
                {/* Custom packaging type input */}
                {selectedPackaging === 'OTHER_UNKNOWN' && (
                  <div>
                    <Label htmlFor="customPackagingType">Specify Packaging Type</Label>
                    <Input 
                      id="customPackagingType" 
                      value={customPackagingType} 
                      onChange={(e) => setCustomPackagingType(e.target.value)} 
                      placeholder="e.g., Vacuum-sealed pouch, Custom container"
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please describe the specific packaging type.
                    </p>
                  </div>
                )}
                 <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="text"
                    value={quantity} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > 1 && val.startsWith('0')) {
                        val = val.substring(1);
                      }
                      if (val === '' || parseInt(val, 10) === 0) {
                        setQuantity(val);
                      } else {
                        setQuantity(val);
                      }
                    }} 
                    placeholder="1"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="e.g., Brand, bought at Farmer's Market, bulk bin at Store X"
                  />
                </div>
                {/* TODO: Add photo upload fields */}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Submitting...' : 'Log Purchase'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Your Progress */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Your Progress
              </CardTitle>
              <CardDescription>Track your sustainable packaging choices over time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{scoreboardStats.totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Items Logged</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{scoreboardStats.lowWasteItems}</p>
                  <p className="text-sm text-muted-foreground">Low-Waste Choices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{scoreboardStats.highWasteItems}</p>
                  <p className="text-sm text-muted-foreground">High-Waste Choices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{scoreboardStats.lowWastePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Low-Waste Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights and Tips Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Your Insights & Tips
                </CardTitle>
                {ANTHROPIC_API_KEY && userLogs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAIModal}
                    disabled={isGeneratingAlternatives || isGeneratingInsights}
                    className="flex items-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {isGeneratingAlternatives || isGeneratingInsights ? 'Generating AI Insights...' : 'Get AI Insights'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {packagingSummaryData.length > 0 ? (
                  // Show personalized insights when data is available
                  generatePackagingInsightsAndTips(packagingSummaryData, userLogs).map((insight, idx) => (
                    <p key={idx} className={
                      insight.type === 'encouragement' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-orange-600' :
                      insight.type === 'achievement' ? 'text-purple-600' :
                      'text-blue-600' // for tips
                    }>
                      {insight.message}
                    </p>
                  ))
                ) : (
                  // Show encouraging tips for new users
                  <>
                    <p className="text-blue-600">
                      💡 Start by logging a few purchases to get personalized insights!
                    </p>
                    <p className="text-green-600">
                      🌱 Look for items with no packaging, bulk bins, or recyclable containers.
                    </p>
                    <p className="text-blue-600">
                      🛍️ Bring your own bags and containers when shopping to reduce waste.
                    </p>
                    <p className="text-green-600">
                      ♻️ Choose glass, paper, or metal packaging over plastic when possible.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section - Full Width Below */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Analytics & Trends
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="time-range" className="text-sm font-medium">
              Time Range:
            </Label>
            <Select value={chartTimeRange} onValueChange={(value: 'week' | 'month' | '3months' | 'year') => setChartTimeRange(value)}>
              <SelectTrigger id="time-range" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="3months">Past 3 Months</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Low-Waste Percentage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Low-Waste Choices Over Time</CardTitle>
              <CardDescription>Percentage of low-waste packaging choices per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {filteredChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          if (chartTimeRange === 'week') {
                            return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
                          } else if (chartTimeRange === 'month') {
                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } else {
                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                          }
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis domain={[0, 100]} label={{ value: '% Low-Waste', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Low-Waste Percentage']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="lowWastePercentage" 
                        name="Low-Waste %" 
                        stroke="#22c55e" 
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center p-6">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Track Your Progress</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {packagingSummaryData.length > 0 
                          ? `No data available for the selected time range (${chartTimeRange}). Try expanding your time range.`
                          : 'Start logging your purchases to see your low-waste percentage trends over time.'
                        }
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        🎯 Aim for 80%+ low-waste choices!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Swaps Made Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sustainable Swaps Made</CardTitle>
              <CardDescription>Count of sustainable packaging swaps per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {filteredChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          if (chartTimeRange === 'week') {
                            return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
                          } else if (chartTimeRange === 'month') {
                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } else {
                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                          }
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis allowDecimals={false} label={{ value: '# of Swaps', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value} swap(s)`, 'Swaps Made']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalSwapsMade" 
                        name="Swaps Made" 
                        fill="#3b82f6" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center p-6">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Sustainable Swaps</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {packagingSummaryData.length > 0 
                          ? `No swaps data available for the selected time range (${chartTimeRange}). Try expanding your time range.`
                          : 'When you replace high-waste packaging with low-waste alternatives, your swaps will appear here.'
                        }
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        💡 Every swap makes a difference!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Your Logged Items Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-6 w-6 text-gray-600" />
          Your Logged Items
        </h2>
        {isLoading && userLogs.length === 0 && <p>Loading your logs...</p>}
        {!isLoading && userLogs.length === 0 && <p>You haven't logged any items yet. Start by adding a purchase above!</p>}
        
        {groupItemsByDay.length > 0 && (
          <div className="space-y-4">
            {groupItemsByDay.map(({ date, displayDate, items }) => {
              const isCollapsed = collapsedDays.has(date);
              const dayStats = {
                total: items.length,
                lowWaste: items.filter(item => item.is_low_waste).length,
                highWaste: items.filter(item => !item.is_low_waste).length,
                switches: items.filter(item => item.made_switch).length
              };
              
              return (
                <Card key={date} className="border-l-4 border-l-blue-500">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDayCollapsed(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          )}
                          <CardTitle className="text-lg">{displayDate}</CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {dayStats.total} item{dayStats.total !== 1 ? 's' : ''}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {dayStats.lowWaste} low-waste
                        </span>
                        {dayStats.switches > 0 && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            {dayStats.switches} switch{dayStats.switches !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {!isCollapsed && (
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((log) => {
                          const switchInfo = getSwitchNotificationMessage(log);
                          
                          return (
                            <div 
                              key={log.id} 
                              className={`p-4 rounded-lg border-2 ${log.is_low_waste ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Food Image */}
                                <div className="flex-shrink-0">
                                  {log.image_url ? (
                                    <img 
                                      src={log.image_url} 
                                      alt={log.food_item_name} 
                                      className="h-12 w-12 rounded-lg object-cover border"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                                      <ImageOff className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Item Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{log.food_item_name}</h4>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Packaging: {packagingTypes.find(p => p.id === log.packaging_type)?.label || log.packaging_type}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Quantity: {log.quantity} | 
                                        <span className={`ml-1 font-medium ${log.is_low_waste ? 'text-green-600' : 'text-red-600'}`}>
                                          {log.is_low_waste ? 'Low Waste' : 'High Waste'}
                                        </span>
                                      </p>
                                      {log.notes && (
                                        <p className="text-sm text-gray-500 mt-1">
                                          Notes: {log.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenEditModal(log)}
                                        className="flex items-center gap-1 h-8"
                                      >
                                        <Edit className="h-3 w-3" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteLog(log.id, log.food_item_name)}
                                        className="flex items-center gap-1 h-8"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Switch Information */}
                                  {switchInfo.type !== 'none' && (
                                    <div className={`mt-2 p-2 rounded text-sm ${
                                      switchInfo.type === 'positive' ? 'bg-green-100 text-green-700 border border-green-200' :
                                      switchInfo.type === 'negative' ? 'bg-red-100 text-red-700 border border-red-200' :
                                      'bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}>
                                      {switchInfo.message}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {editingLogItem && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => !isOpen && closeEditModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Log</DialogTitle>
              <DialogDescription>
                Edit the details of the log entry.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="editFoodItemName">Food Item Name</Label>
              <Input 
                id="editFoodItemName"
                value={editFoodItemName}
                onChange={(e) => setEditFoodItemName(e.target.value)}
                placeholder="e.g., Apples, Oats, Bread"
                required
              />
              <Label htmlFor="editPackagingType">Packaging Type</Label>
              <Select onValueChange={(value) => {
                setEditSelectedPackaging(value);
                if (value !== 'OTHER_UNKNOWN') {
                  setEditCustomPackagingType('');
                }
              }} value={editSelectedPackaging} required>
                <SelectTrigger id="editPackagingType">
                  <SelectValue placeholder="Select packaging type..." />
                </SelectTrigger>
                <SelectContent>
                  {packagingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${type.isLowWaste ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {type.label}
                        <span className={`text-xs px-1 py-0.5 rounded ${type.isLowWaste ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {type.isLowWaste ? 'Low Waste' : 'High Waste'}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom packaging type input for edit modal */}
              {editSelectedPackaging === 'OTHER_UNKNOWN' && (
                <div>
                  <Label htmlFor="editCustomPackagingType">Specify Packaging Type</Label>
                  <Input 
                    id="editCustomPackagingType" 
                    value={editCustomPackagingType} 
                    onChange={(e) => setEditCustomPackagingType(e.target.value)} 
                    placeholder="e.g., Vacuum-sealed pouch, Custom container"
                    required 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Please describe the specific packaging type.
                  </p>
                </div>
              )}
              
              <Label htmlFor="editQuantity">Quantity</Label>
              <Input 
                id="editQuantity"
                type="text"
                value={editQuantity}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length > 1 && val.startsWith('0')) {
                    val = val.substring(1);
                  }
                  if (val === '' || parseInt(val, 10) === 0) {
                    setEditQuantity(val);
                  } else {
                    setEditQuantity(val);
                  }
                }}
                placeholder="1"
                required
              />
              <Label htmlFor="editNotes">Notes (Optional)</Label>
              <Input 
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g., Brand, bought at Farmer's Market, bulk bin at Store X"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditModal} disabled={isSubmittingEdit}>Cancel</Button>
              <Button onClick={handleEditSubmit} disabled={isSubmittingEdit}>
                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Insights Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              AI-Powered Sustainability Insights
            </DialogTitle>
            <DialogDescription>
              Get personalized packaging alternatives and sustainability insights based on your shopping patterns.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Packaging Alternatives Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Smart Packaging Alternatives</h3>
                <Button
                  onClick={() => generatePackagingAlternatives(selectedHighWasteItems)}
                  disabled={isGeneratingAlternatives || selectedHighWasteItems.length === 0}
                  size="sm"
                >
                  {isGeneratingAlternatives ? 'Generating...' : 'Generate Alternatives'}
                </Button>
              </div>
              
              {selectedHighWasteItems.length === 0 ? (
                <p className="text-gray-500 text-sm">No high-waste items found to suggest alternatives for.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    Found {selectedHighWasteItems.length} high-waste item{selectedHighWasteItems.length !== 1 ? 's' : ''} to suggest alternatives for.
                  </p>
                  
                  {packagingAlternatives.length > 0 && (
                    <div className="space-y-3">
                      {packagingAlternatives.map((alternative) => (
                        <Card key={alternative.id} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">{alternative.foodItem}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Current:</span> {alternative.currentPackaging}
                                </p>
                                <p className="text-sm text-green-600 mt-1">
                                  <span className="font-medium">Better Alternative:</span> {alternative.suggestedAlternative}
                                </p>
                                <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                                  alternative.difficultyLevel === 'Easy' ? 'bg-green-100 text-green-800' :
                                  alternative.difficultyLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {alternative.difficultyLevel} to find
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-medium">Why better:</span> {alternative.reasoning}
                                </p>
                                <p className="text-sm text-blue-600 mb-2">
                                  <span className="font-medium">Impact:</span> {alternative.impactReduction}
                                </p>
                                <p className="text-sm text-purple-600">
                                  <span className="font-medium">Where to find:</span> {alternative.whereToFind}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Sustainability Insights Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Personalized Sustainability Insights</h3>
                <Button
                  onClick={generateSustainabilityInsights}
                  disabled={isGeneratingInsights || userLogs.length === 0}
                  size="sm"
                >
                  {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
                </Button>
              </div>
              
              {userLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">Log some purchases to get personalized sustainability insights.</p>
              ) : (
                <>
                  {sustainabilityInsights.length > 0 && (
                    <div className="space-y-3">
                      {sustainabilityInsights.map((insight) => {
                        const bgColor = 
                          insight.type === 'achievement' ? 'bg-green-50 border-green-200' :
                          insight.type === 'challenge' ? 'bg-blue-50 border-blue-200' :
                          insight.type === 'improvement_suggestion' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-purple-50 border-purple-200';
                        
                        const textColor = 
                          insight.type === 'achievement' ? 'text-green-800' :
                          insight.type === 'challenge' ? 'text-blue-800' :
                          insight.type === 'improvement_suggestion' ? 'text-yellow-800' :
                          'text-purple-800';
                        
                        return (
                          <Card key={insight.id} className={`border-2 ${bgColor}`}>
                            <CardContent className="pt-4">
                              <h4 className={`font-semibold ${textColor} mb-2`}>{insight.title}</h4>
                              <p className="text-gray-700 text-sm mb-3">{insight.description}</p>
                              {insight.actionItems && insight.actionItems.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-600 mb-2">Action Items:</p>
                                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    {insight.actionItems.map((action, index) => (
                                      <li key={index}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackagingSwapPage; 