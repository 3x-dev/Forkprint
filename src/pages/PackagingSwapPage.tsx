import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLogs, setUserLogs] = useState<PackagingLog[]>([]);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [currentLogItemForSwitch, setCurrentLogItemForSwitch] = useState<PackagingLog | null>(null);
  const [previousItemDescription, setPreviousItemDescription] = useState('');
  const [isSubmittingSwitch, setIsSubmittingSwitch] = useState(false);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLogItem, setEditingLogItem] = useState<PackagingLog | null>(null);
  const [editFoodItemName, setEditFoodItemName] = useState('');
  const [editSelectedPackaging, setEditSelectedPackaging] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // --- START ADDITION: State for chart data ---
  const [packagingSummaryData, setPackagingSummaryData] = useState<PackagingSwapSummary[]>([]);
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
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { swapsMade: 0, lowWasteItems: 0, totalItems: 0 };
      }

      dailyData[date].totalItems++;
      if (log.is_low_waste) {
        dailyData[date].lowWasteItems++;
      }
      if (log.made_switch) {
        dailyData[date].swapsMade++;
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

    const currentQuantity = parseInt(quantity, 10);
    if (isNaN(currentQuantity) || currentQuantity < 1) {
      toast.error('Quantity must be a whole number greater than 0.');
      return;
    }

    if (!user || !foodItemName || !selectedPackaging) {
      toast.warning('Please enter food item name and select packaging type.');
      return;
    }

    const packagingDetail = packagingTypes.find(p => p.id === selectedPackaging);
    if (!packagingDetail) {
        toast.error('Invalid packaging type selected.');
        return;
    }

    setIsLoading(true);
    try {
      // Use `as any` for insert operation as well
      const { data, error } = await (supabase.from('packaging_logs') as any)
        .insert([{ 
          user_id: user.id, 
          food_item_name: foodItemName,
          packaging_type: selectedPackaging,
          is_low_waste: packagingDetail.isLowWaste,
          quantity: currentQuantity,
          notes: notes || null,
        }])
        .select(); // Ensure .select() is called to get the inserted data back

      if (error) throw error;
      
      if (data && data.length > 0) {
        const newLog = data[0] as PackagingLog;
        setUserLogs(prevLogs => [newLog, ...prevLogs]);
        setCurrentLogItemForSwitch(newLog); 
        setIsSwitchModalOpen(true); 

        // Show dynamic feedback for new log
        const previousLog = getPreviousLogForFoodItem(newLog.food_item_name, newLog.id);
        showDynamicFeedback(newLog, previousLog);
      }
      toast.success('Packaging log submitted!');
      setFoodItemName('');
      setSelectedPackaging('');
      setQuantity('1');
      setNotes('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error submitting log';
      toast.error('Failed to submit log.', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchSubmit = async () => {
    if (!currentLogItemForSwitch || !user) return;

    setIsSubmittingSwitch(true);
    try {
      const { data, error } = await (supabase.from('packaging_logs') as any)
        .update({
          made_switch: true,
          previous_item_description: previousItemDescription || null,
          // TODO: Add photo_url_old_item if implementing photo uploads for old item
        })
        .eq('id', currentLogItemForSwitch.id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Update the log in the local state
        setUserLogs(prevLogs => 
          prevLogs.map(log => log.id === currentLogItemForSwitch.id ? data[0] as PackagingLog : log)
        );
        toast.success('Switch information saved!');
      }
      closeSwitchModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving switch info';
      toast.error('Failed to save switch information.', { description: errorMessage });
    } finally {
      setIsSubmittingSwitch(false);
    }
  };

  const closeSwitchModal = () => {
    setIsSwitchModalOpen(false);
    setCurrentLogItemForSwitch(null);
    setPreviousItemDescription('');
  };

  const handleOpenEditModal = (logItem: PackagingLog) => {
    setEditingLogItem(logItem);
    setEditFoodItemName(logItem.food_item_name);
    setEditSelectedPackaging(logItem.packaging_type);
    setEditQuantity(logItem.quantity.toString());
    setEditNotes(logItem.notes || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingLogItem(null);
    setEditFoodItemName('');
    setEditSelectedPackaging('');
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

    const packagingDetail = packagingTypes.find(p => p.id === editSelectedPackaging);
    if (!packagingDetail) {
        toast.error('Invalid packaging type selected for edit.');
        return;
    }

    setIsSubmittingEdit(true);
    try {
      // --- START MODIFICATION: Automatic switch detection ---
      let madeSwitch = false;
      let previousPackagingTypeForDB: string | null = null;

      if (editingLogItem && editingLogItem.packaging_type !== editSelectedPackaging) {
        madeSwitch = true;
        previousPackagingTypeForDB = editingLogItem.packaging_type;
      }
      // --- END MODIFICATION ---

      const updatedLogData: Partial<PackagingLog> = {
        food_item_name: editFoodItemName,
        packaging_type: editSelectedPackaging,
        is_low_waste: packagingDetail.isLowWaste,
        quantity: currentEditQuantity,
        notes: editNotes || null,
        made_switch: madeSwitch,
        previous_packaging_type: previousPackagingTypeForDB,
        // Ensure previous_item_description is explicitly null if not set or if a switch occurred
        previous_item_description: madeSwitch ? null : (editingLogItem?.previous_item_description || null),
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
      
      const previousLogForEditedItem = getPreviousLogForFoodItem(locallyUpdatedLog.food_item_name, locallyUpdatedLog.id);
      showDynamicFeedback(locallyUpdatedLog, previousLogForEditedItem);
      
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

  const showDynamicFeedback = (currentLog: PackagingLog, previousLog: PackagingLog | null) => {
    const currentPackagingInfo = packagingTypes.find(p => p.id === currentLog.packaging_type);
    if (!currentPackagingInfo) return; // Should not happen if validation is correct

    if (previousLog) {
      const previousPackagingInfo = packagingTypes.find(p => p.id === previousLog.packaging_type);
      if (!previousPackagingInfo) return;

      if (currentLog.packaging_type === previousLog.packaging_type) {
        if (!currentPackagingInfo.isLowWaste) {
          toast.info(
            `You previously logged "${currentLog.food_item_name}" with the same packaging.`, 
            {
              description: `Consider looking for options with less waste! You noted: "${previousLog.notes || '-'}" last time. Check local stores or farmer's markets.`,
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
      } else {
        if (currentPackagingInfo.isLowWaste && !previousPackagingInfo.isLowWaste) {
          toast.success(
            `Fantastic switch for "${currentLog.food_item_name}"! 🎉`,
            {
              description: `You went from ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. That's a great improvement!`,
              duration: 8000,
            }
          );
        } else if (!currentPackagingInfo.isLowWaste && previousPackagingInfo.isLowWaste) {
          toast.warning(
            `"${currentLog.food_item_name}" packaging changed.`, 
            {
              description: `You previously used ${previousPackagingInfo.label} (low waste), but now logged ${currentPackagingInfo.label}. Try to stick to low-waste options!`,
              duration: 8000,
            }
          );
        } else if (currentPackagingInfo.isLowWaste && previousPackagingInfo.isLowWaste) {
            toast.info(
            `"${currentLog.food_item_name}" packaging changed, but still low waste.`,
            {
              description: `From ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. Keep up the good work choosing sustainable options!`,
              duration: 7000,
            }
          );
        } else { // Both high waste, but different
          toast.info(
            `Packaging for "${currentLog.food_item_name}" changed.`, 
            {
              description: `From ${previousPackagingInfo.label} to ${currentPackagingInfo.label}. Still aiming for low-waste options!`,
              duration: 7000,
            }
          );
        }
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Log New Purchase</CardTitle>
          <CardDescription>Record a food item and its packaging type.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitLog} className="space-y-4">
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
              <Select onValueChange={setSelectedPackaging} value={selectedPackaging} required>
                <SelectTrigger id="packagingType">
                  <SelectValue placeholder="Select packaging..." />
                </SelectTrigger>
                <SelectContent>
                  {packagingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label} ({type.isLowWaste ? 'Low Waste' : 'High Waste'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Log Purchase'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scoreboard</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
          </CardContent>
        </Card>

        {/* --- START ADDITION: Insights and Tips Section --- */}
        {packagingSummaryData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Insights & Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generatePackagingInsightsAndTips(packagingSummaryData, userLogs).map((insight, idx) => (
                  <p key={idx} className={
                    insight.type === 'encouragement' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-orange-600' :
                    insight.type === 'achievement' ? 'text-purple-600' :
                    'text-blue-600' // for tips
                  }>
                    {insight.message}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* --- END ADDITION --- */}

        {/* --- START ADDITION: Charts Section --- */}
        {packagingSummaryData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Low-Waste Percentage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Low-Waste Choices Over Time</CardTitle>
                <CardDescription>Percentage of low-waste packaging choices per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={packagingSummaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis domain={[0, 100]} label={{ value: '% Low-Waste', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Low-Waste Percentage']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packagingSummaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis allowDecimals={false} label={{ value: '# of Swaps', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value} swap(s)`, 'Swaps Made']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalSwapsMade" 
                        name="Swaps Made" 
                        fill="#3b82f6" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* --- END ADDITION --- */}

        <h2 className="text-2xl font-semibold mb-4">Your Logged Items</h2>
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
                      Logged on: {new Date(log.created_at).toLocaleDateString()}
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

                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-3 mr-2"
                      onClick={() => handleOpenEditModal(log)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleDeleteLog(log.id, log.food_item_name)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {currentLogItemForSwitch && (
        <Dialog open={isSwitchModalOpen} onOpenChange={(isOpen) => !isOpen && closeSwitchModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Did you make a sustainable switch?</DialogTitle>
              <DialogDescription>
                Did this purchase of "{currentLogItemForSwitch.food_item_name}" replace an item you used to buy with less sustainable packaging?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="previousItemDesc">Describe the old product/packaging (Optional)</Label>
              <Input 
                id="previousItemDesc"
                value={previousItemDescription}
                onChange={(e) => setPreviousItemDescription(e.target.value)}
                placeholder="e.g., Used to buy cereal in a plastic bag, now in cardboard box"
              />
              {/* TODO: Add input for photo_url_old_item here */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeSwitchModal} disabled={isSubmittingSwitch}>Not a switch / Skip</Button>
              <Button onClick={handleSwitchSubmit} disabled={isSubmittingSwitch}>
                {isSubmittingSwitch ? 'Saving...' : 'Yes, I made a switch!'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
              <Select onValueChange={setEditSelectedPackaging} value={editSelectedPackaging} required>
                <SelectTrigger id="editPackagingType">
                  <SelectValue placeholder="Select packaging..." />
                </SelectTrigger>
                <SelectContent>
                  {packagingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label} ({type.isLowWaste ? 'Low Waste' : 'High Waste'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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