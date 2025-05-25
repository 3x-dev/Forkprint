import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Package, TrendingUp, BarChart3, PlusCircle, Edit, Trash2, Lightbulb, CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

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
      // Use the original date without timezone correction
      const logDate = new Date(log.created_at);
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

    // Clear previous errors
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
      // Use selectedPurchaseDate for the date part, and current time for the time part
      const purchaseDate = new Date(selectedPurchaseDate);
      const now = new Date();
      purchaseDate.setHours(now.getHours());
      purchaseDate.setMinutes(now.getMinutes());
      purchaseDate.setSeconds(now.getSeconds());
      purchaseDate.setMilliseconds(now.getMilliseconds());

      // Use `as any` for insert operation as well
      const { data, error } = await (supabase.from('packaging_logs') as any)
        .insert([{ 
          user_id: user.id, 
          food_item_name: foodItemName,
          packaging_type: packagingTypeToSave,
          is_low_waste: packagingDetail.isLowWaste,
          quantity: currentQuantity,
          notes: notes || null,
          created_at: purchaseDate.toISOString(),
        }])
        .select(); // Ensure .select() is called to get the inserted data back

      if (error) throw error;
      
      if (data && data.length > 0) {
        const newLog = data[0] as PackagingLog;
        
        // Automatically detect switch type based on previous logs
        const previousLog = getPreviousLogForFoodItem(newLog.food_item_name, newLog.id);
        const switchDetection = detectSwitchType(packagingTypeToSave, packagingDetail.isLowWaste, previousLog);
        
        // Update the log with switch information if a switch was detected
        if (switchDetection.madeSwitch) {
          const { error: updateError } = await (supabase.from('packaging_logs') as any)
            .update({
              made_switch: true,
              previous_packaging_type: switchDetection.previousPackagingType,
            })
            .eq('id', newLog.id)
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('Error updating switch information:', updateError);
          } else {
            // Update local state with switch information
            newLog.made_switch = true;
            newLog.previous_packaging_type = switchDetection.previousPackagingType;
          }
        }
        
        setUserLogs(prevLogs => [newLog, ...prevLogs]);
        
        // Show dynamic feedback for new log
        showDynamicFeedback(newLog, previousLog, switchDetection.switchType);
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
      const previousLogForEditedItem = getPreviousLogForFoodItem(editFoodItemName, editingLogItem.id);
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
  const getPreviousLogForFoodItem = (foodName: string, currentLogIdToExclude?: string): PackagingLog | null => {
    const relevantLogs = userLogs
      .filter(log => log.food_item_name.toLowerCase() === foodName.toLowerCase() && log.id !== currentLogIdToExclude)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by newest first
    return relevantLogs.length > 0 ? relevantLogs[0] : null;
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
        Try to buy foods with low-waste or no plastic packaging. Log your purchases below.
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
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Your Insights & Tips
              </CardTitle>
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
        
        {userLogs.length > 0 && (
          <div className="space-y-4">
            {userLogs.map((log) => {
              // --- START MODIFICATION: Use helper for switch message ---
              const switchInfo = getSwitchNotificationMessage(log);
              // --- END MODIFICATION ---
              return (
                <Card key={log.id} className={log.is_low_waste ? 'border-green-500' : 'border-red-500'}>
                  <CardHeader>
                    <CardTitle className="text-lg">{log.food_item_name}</CardTitle>
                    <CardDescription>
                      Logged on: {(() => {
                        const logDate = new Date(log.created_at);
                        return logDate.toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      })()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Packaging: {packagingTypes.find(p => p.id === log.packaging_type)?.label || log.packaging_type}</p>
                    <p>Quantity: {log.quantity}</p>
                    <p>Low Waste: <span className={log.is_low_waste ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{log.is_low_waste ? 'Yes' : 'No'}</span></p>
                    {log.notes && <p>Notes: {log.notes}</p>}
                    
                    {/* --- START MODIFICATION: Display detailed switch message --- */}
                    {switchInfo.type !== 'none' && (
                      <p 
                        className={`text-sm mt-1 ${
                          switchInfo.type === 'positive' ? 'text-green-700' :
                          switchInfo.type === 'negative' ? 'text-red-700' :
                          'text-blue-700' // neutral
                        }`}
                      >
                        {switchInfo.message}
                      </p>
                    )}
                    {/* --- END MODIFICATION --- */}

                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(log)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLog(log.id, log.food_item_name)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
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
    </div>
  );
};

export default PackagingSwapPage; 