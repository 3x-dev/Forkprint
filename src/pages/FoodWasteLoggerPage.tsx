import * as React from 'react';
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Trash2, BarChart, Utensils, ArrowLeft, CalendarIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// Interface for a food serving
interface FoodServing {
  id: string;
  user_id: string;
  meal_name: string;
  served_at: string;
  notes?: string;
  created_at: string;
}

// Interface for a served portion
interface ServedPortion {
  id: string;
  serving_id: string;
  user_id: string;
  custom_food_item_name: string;
  quantity_served: number;
  unit_served: string;
  description?: string;
  created_at: string;
}

// Interface for a waste entry
interface WasteEntry {
  id: string;
  served_portion_id: string;
  user_id: string;
  quantity_wasted_as_fraction_of_served: number;
  user_waste_description?: string;
  waste_reason?: string;
  disposal_action_taken?: string;
  created_at: string;
}

// Define a type for the portion object as returned by Supabase join
interface PortionFromSupabase extends ServedPortion {
  food_waste_entries?: WasteEntry[];
}

// Combined interface for displaying in the UI
interface FoodWasteLogEntry {
  serving: FoodServing;
  portions: (ServedPortion & {
    waste?: WasteEntry;
  })[];
}

// Interface for waste summary data
interface WasteSummary {
  date: string;
  percentage_consumed: number;
  percentage_wasted: number;
}

const wasteReasons = [
  "Too much served",
  "Didn't like taste",
  "Expired",
  "Accident",
  "Other"
];

const disposalMethods = [
  "Composted",
  "General Waste",
  "Fed to pets",
  "Saved for later",
  "Recycled",
  "Gave away",
  "Down the drain",
  "Other"
];

const mealTypes = [
  "Breakfast",
  "Brunch",
  "Lunch",
  "Dinner",
  "Snack",
  "Other"
];

const FoodWasteLoggerPage: React.FC = () => {
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [mealName, setMealName] = useState('');
  const [mealNotes, setMealNotes] = useState('');
  const [portions, setPortions] = useState<{
    name: string;
    quantity: string;
    unit: string;
    description: string;
  }[]>([{ name: '', quantity: '', unit: '', description: '' }]);
  const [selectedMealDate, setSelectedMealDate] = useState<Date | undefined>(new Date());
  
  // Waste logging states
  const [selectedServingId, setSelectedServingId] = useState<string | null>(null);
  const [wasteEntries, setWasteEntries] = useState<{
    portionId: string;
    wastedFraction: string;
    description: string;
    reason: string;
    otherReason: string;
    disposalMethod: string;
    otherDisposalMethod: string;
  }[]>([]);
  
  // Data states
  const [foodServings, setFoodServings] = useState<FoodWasteLogEntry[]>([]);
  const [wasteSummaryData, setWasteSummaryData] = useState<WasteSummary[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState<'week' | 'month' | '3months' | 'year'>('month');
  
  // Fetch food servings from Supabase
  const fetchFoodServings = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch food servings with related portions and waste entries
      const { data: servingsData, error: servingsError } = await supabase
        .from('food_servings')
        .select(`
          *,
          served_portions (
            *,
            food_waste_entries (*)
          )
        `)
        .eq('user_id', user.id)
        .order('served_at', { ascending: false });
      
      if (servingsError) {
        console.error("Error fetching food servings:", servingsError);
        throw new Error(`Servings Error: ${servingsError.message}`);
      }
      
      const logEntries: FoodWasteLogEntry[] = (servingsData || []).map(serving => {
        const portionsWithWaste = (serving.served_portions || []).map((portion: PortionFromSupabase) => ({
          ...portion,
          waste: portion.food_waste_entries && portion.food_waste_entries.length > 0 ? portion.food_waste_entries[0] : undefined // Assuming one waste entry per portion for simplicity, adjust if needed
        }));
        return {
          serving: {
            id: serving.id,
            user_id: serving.user_id,
            meal_name: serving.meal_name,
            served_at: serving.served_at,
            notes: serving.notes,
            created_at: serving.created_at,
          } as FoodServing,
          portions: portionsWithWaste as (ServedPortion & { waste?: WasteEntry })[]
        };
      });
      
      setFoodServings(logEntries);
      generateWasteSummaryData(logEntries); // Ensure this function can handle the new structure if it also changed
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching food waste data.';
      console.error("Detailed error in fetchFoodServings:", error);
      toast.error("Failed to fetch food waste data.", { 
        description: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate summary data for the chart
  const generateWasteSummaryData = (entries: FoodWasteLogEntry[]) => {
    const dailyData: Record<string, { totalConsumed: number, totalItems: number, totalWastedItems: number }> = {};
    
    entries.forEach(entry => {
      // Fix timezone issue by adding one day to get accurate local dates
      const servingDate = new Date(entry.serving.served_at);
      servingDate.setDate(servingDate.getDate() + 1);
      const date = servingDate.toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = { totalConsumed: 0, totalItems: 0, totalWastedItems: 0 };
      }
      
      entry.portions.forEach(portion => {
        dailyData[date].totalItems++;
        
        if (portion.waste) {
          const consumedFraction = 1 - portion.waste.quantity_wasted_as_fraction_of_served;
          dailyData[date].totalConsumed += consumedFraction;
          if (portion.waste.quantity_wasted_as_fraction_of_served > 0) {
            dailyData[date].totalWastedItems++;
          }
        } else {
          // If no waste entry, assume fully consumed
          dailyData[date].totalConsumed++;
        }
      });
    });
    
    // Convert to array for chart
    const summaryData: WasteSummary[] = Object.entries(dailyData).map(([date, data]) => {
      const percentage_consumed = data.totalItems > 0 ? (data.totalConsumed / data.totalItems) * 100 : 0;
      const percentage_wasted = data.totalItems > 0 ? 100 - percentage_consumed : 0;
      return {
        date,
        percentage_consumed,
        percentage_wasted
      };
    });
    
    // Sort by date
    summaryData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setWasteSummaryData(summaryData);
  };
  
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Helper function to get today's waste summary
  const getTodaysWasteSummary = (summaryData: WasteSummary[]): WasteSummary | null => {
    const todayStr = getTodayDateString();
    return summaryData.find(s => s.date === todayStr) || null;
  };

  // Helper function to calculate average waste for the last N days (excluding today)
  const getAverageWasteLastNDays = (summaryData: WasteSummary[], numDays: number): number | null => {
    const todayStr = getTodayDateString();
    const pastData = summaryData.filter(s => s.date < todayStr);
    const recentData = pastData.slice(-numDays);
    if (recentData.length === 0) return null;
    const totalWaste = recentData.reduce((sum, s) => sum + s.percentage_wasted, 0);
    return totalWaste / recentData.length;
  };

  // Helper function to filter data by time range
  const filterDataByTimeRange = (data: WasteSummary[], timeRange: 'week' | 'month' | '3months' | 'year') => {
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
    return filterDataByTimeRange(wasteSummaryData, chartTimeRange);
  }, [wasteSummaryData, chartTimeRange]);

  // Generate encouragement message based on waste percentage and trends
  const generateInsightsAndTips = (currentSummaryData: WasteSummary[]) => {
    const insights: { message: string; type: 'tip' | 'encouragement' | 'warning' }[] = [];
    const todaySummary = getTodaysWasteSummary(currentSummaryData);
    const avgWasteLast7Days = getAverageWasteLastNDays(currentSummaryData, 7);

    if (todaySummary) {
      const todaysWaste = todaySummary.percentage_wasted;
      if (todaysWaste === 0) {
        insights.push({ message: "Amazing! Zero waste today! You're a sustainability superstar!", type: 'encouragement' });
      } else if (todaysWaste <= 10) {
        insights.push({ message: "Great job on keeping waste low today! Every little bit helps.", type: 'encouragement' });
      } else if (todaysWaste <= 25) {
        insights.push({ message: "Good effort! You're mindful of your consumption.", type: 'encouragement' });
        insights.push({ message: "Tip: Try planning meals for the next few days to use up ingredients.", type: 'tip' });
      } else if (todaysWaste <= 50) {
        insights.push({ message: "A bit of waste today, but awareness is the first step!", type: 'warning' });
        insights.push({ message: "Tip: Check 'use-by' dates regularly and prioritize older items.", type: 'tip' });
      } else {
        insights.push({ message: "Let's focus on reducing waste tomorrow.", type: 'warning' });
        insights.push({ message: "Tip: Serve smaller portions initially; you can always have seconds!", type: 'tip' });
      }

      if (avgWasteLast7Days !== null) {
        if (todaysWaste < avgWasteLast7Days) {
          insights.push({ message: `Fantastic! Your waste today (${todaysWaste.toFixed(1)}%) is lower than your recent average (${avgWasteLast7Days.toFixed(1)}%). Keep up the great habits!`, type: 'encouragement' });
        } else if (todaysWaste > avgWasteLast7Days && avgWasteLast7Days < todaysWaste * 0.8 /* significantly more */ ) {
          insights.push({ message: `Heads up! Waste today (${todaysWaste.toFixed(1)}%) is higher than your recent average (${avgWasteLast7Days.toFixed(1)}%). Let's get back on track!`, type: 'warning' });
          insights.push({ message: "Tip: Revisit your shopping list to avoid overbuying, especially impulse buys.", type: 'tip' });
        }
      }
    } else {
      insights.push({ message: "Log your meals and waste to see your trends and get helpful tips!", type: 'tip' });
    }

    if (currentSummaryData.length < 3 && currentSummaryData.length > 0) {
        insights.push({ message: "Keep logging for a few more days to unlock more detailed trend insights!", type: 'tip' });
    }
    
    if (avgWasteLast7Days !== null && avgWasteLast7Days > 30 && (!todaySummary || todaySummary.percentage_wasted > 30)) {
        insights.push({ message: "Pattern detected: Your average waste seems a bit high. Small changes can make a big difference!", type: 'warning' });
        insights.push({ message: "Sustainability Tip: Explore creative ways to use leftovers. Many websites offer recipes for leftover ingredients!", type: 'tip' });
    }

    return insights;
  };
  
  useEffect(() => {
    if (user) {
      fetchFoodServings();
    }
  }, [user]);
  
  // Add a portion field to the form
  const addPortion = () => {
    setPortions([...portions, { name: '', quantity: '', unit: '', description: '' }]);
  };
  
  // Remove a portion from the form
  const removePortion = (index: number) => {
    setPortions(portions.filter((_, i) => i !== index));
  };
  
  // Update a portion field
  const updatePortion = (index: number, field: string, value: string) => {
    const updatedPortions = [...portions];
    updatedPortions[index] = { ...updatedPortions[index], [field]: value };
    setPortions(updatedPortions);
  };
  
  // Handle adding a new meal with portions
  const handleAddMeal = async () => {
    if (!user) {
      toast.error("You must be logged in to add items.");
      return;
    }

    if (!mealName) {
      toast.error("Please enter a meal name.");
      return;
    }
    
    if (!selectedMealDate) {
      toast.error("Please select a date for the meal.");
      return;
    }

    // Validate quantity to ensure it's not 0
    if (portions.some(p => !p.name || !p.quantity || parseFloat(p.quantity) === 0)) {
      toast.error("Please complete all portion fields and ensure quantity is not zero.");
      return;
    }

    setIsLoading(true);

    try {
      // Use selectedMealDate for the date part, and current time for the time part.
      const mealDate = new Date(selectedMealDate);
      const now = new Date();
      mealDate.setHours(now.getHours());
      mealDate.setMinutes(now.getMinutes());
      mealDate.setSeconds(now.getSeconds());
      mealDate.setMilliseconds(now.getMilliseconds());
      
      const mealDateStringForQuery = mealDate.toISOString().split('T')[0]; // YYYY-MM-DD format for querying

      // Check for an existing serving for this meal type on the selected day
      const { data: existingServings, error: fetchError } = await supabase
        .from('food_servings')
        .select('id, notes')
        .eq('user_id', user.id)
        .eq('meal_name', mealName)
        .gte('served_at', `${mealDateStringForQuery}T00:00:00.000Z`)
        .lte('served_at', `${mealDateStringForQuery}T23:59:59.999Z`)
        .order('served_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let servingIdToUse: string;
      let existingNotes: string | null = null;

      if (existingServings && existingServings.length > 0) {
        // Use existing serving
        servingIdToUse = existingServings[0].id;
        existingNotes = existingServings[0].notes;
        toast.info(`Adding items to existing "${mealName}" for ${mealDate.toLocaleDateString()}.`);

        // Optionally update notes if new notes are provided
        if (mealNotes && mealNotes !== existingNotes) {
          const { error: updateNotesError } = await supabase
            .from('food_servings')
            .update({ notes: mealNotes })
            .eq('id', servingIdToUse);
          if (updateNotesError) console.error("Error updating notes:", updateNotesError); // Log error but continue
        }

      } else {
        // 1. Create a new serving
        const { data: newServingData, error: servingError } = await supabase
          .from('food_servings')
          .insert({
            user_id: user.id,
            meal_name: mealName,
            notes: mealNotes || null,
            served_at: mealDate.toISOString(), // Use the constructed mealDate
          })
          .select()
          .single();

        if (servingError) throw servingError;
        servingIdToUse = newServingData.id;
      }

      // 2. Create each portion, associating with the servingIdToUse
      for (const portion of portions) {
        // Ensure quantity is valid before parsing
        const quantity = parseFloat(portion.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          toast.error(`Invalid quantity for item: ${portion.name}. Must be greater than 0.`);
          continue; // Skip this portion or handle error as needed
        }

        const { error: portionError } = await supabase
          .from('served_portions')
          .insert({
            serving_id: servingIdToUse,
            user_id: user.id,
            custom_food_item_name: portion.name,
            quantity_served: quantity, // Use parsed quantity
            unit_served: portion.unit,
            description: portion.description || null,
          });

        if (portionError) throw portionError;
      }

      toast.success(`Meal items for "${mealName}" added successfully!`);

      // Reset form
      setMealName('');
      setMealNotes('');
      setPortions([{ name: '', quantity: '', unit: '', description: '' }]);
      setSelectedMealDate(new Date()); // Reset selected date to today

      // Refresh data
      fetchFoodServings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to add meal items.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Setup waste entries when a serving is selected
  const handleSelectServingForWaste = (servingId: string) => {
    const serving = foodServings.find(s => s.serving.id === servingId);
    
    if (serving) {
      setSelectedServingId(servingId);
      
      // Initialize waste entries for each portion
      const initialWasteEntries = serving.portions.map(portion => ({
        portionId: portion.id,
        // Convert fraction to percentage string for the input field
        wastedFraction: portion.waste ? (portion.waste.quantity_wasted_as_fraction_of_served * 100).toString() : '0',
        description: portion.waste?.user_waste_description || '',
        reason: portion.waste?.waste_reason && !wasteReasons.includes(portion.waste.waste_reason) ? 'Other' : portion.waste?.waste_reason || wasteReasons[0],
        otherReason: portion.waste?.waste_reason && !wasteReasons.includes(portion.waste.waste_reason) ? portion.waste.waste_reason : '',
        disposalMethod: portion.waste?.disposal_action_taken && !disposalMethods.includes(portion.waste.disposal_action_taken) ? 'Other' : portion.waste?.disposal_action_taken || disposalMethods[0],
        otherDisposalMethod: portion.waste?.disposal_action_taken && !disposalMethods.includes(portion.waste.disposal_action_taken) ? portion.waste.disposal_action_taken : ''
      }));
      
      setWasteEntries(initialWasteEntries);
    }
  };
  
  // Update a waste entry field
  const updateWasteEntry = (index: number, field: string, value: string) => {
    const updatedEntries = [...wasteEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };

    if (field === 'reason' && value !== 'Other') {
      updatedEntries[index].otherReason = '';
    }
    if (field === 'disposalMethod' && value !== 'Other') {
      updatedEntries[index].otherDisposalMethod = '';
    }

    setWasteEntries(updatedEntries);
  };
  
  // Handle saving waste entries
  const handleSaveWaste = async () => {
    if (!user || !selectedServingId) return;
    
    setIsLoading(true);
    
    try {
      for (const entry of wasteEntries) {
        // Parse and validate the percentage, then convert to fraction for DB
        const percentage = parseFloat(entry.wastedFraction);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          toast.error(`Invalid waste percentage for portion. Must be between 0 and 100.`);
          setIsLoading(false); // Release loading state
          return; // Stop processing if validation fails for any entry
        }
        const fraction = percentage / 100;
        
        let reasonToSave = entry.reason;
        if (entry.reason === 'Other') {
          reasonToSave = entry.otherReason ? entry.otherReason.trim() : 'Other';
        }

        let disposalToSave = entry.disposalMethod;
        if (entry.disposalMethod === 'Other') {
          disposalToSave = entry.otherDisposalMethod ? entry.otherDisposalMethod.trim() : 'Other';
        }

        // Check if entry already exists
        const { data: existingEntry } = await supabase
          .from('food_waste_entries')
          .select('id')
          .eq('served_portion_id', entry.portionId)
          .maybeSingle();
          
        if (existingEntry) {
          // Update existing entry
          const { error } = await supabase
            .from('food_waste_entries')
            .update({
              quantity_wasted_as_fraction_of_served: fraction,
              user_waste_description: entry.description || null,
              waste_reason: reasonToSave,
              disposal_action_taken: disposalToSave
            })
            .eq('id', existingEntry.id);
            
          if (error) throw error;
        } else {
          // Create new entry
          const { error } = await supabase
            .from('food_waste_entries')
            .insert({
              served_portion_id: entry.portionId,
              user_id: user.id,
              quantity_wasted_as_fraction_of_served: fraction,
              user_waste_description: entry.description || null,
              waste_reason: reasonToSave,
              disposal_action_taken: disposalToSave
            });
            
          if (error) throw error;
        }
      }
      
      toast.success("Food waste recorded successfully!");
      
      // Reset and refresh
      setSelectedServingId(null);
      setWasteEntries([]);
      fetchFoodServings();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to record food waste.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate waste percentages for a serving
  const calculateWastePercentage = (serving: FoodWasteLogEntry) => {
    const portionsWithWaste = serving.portions.filter(p => p.waste);
    
    if (portionsWithWaste.length === 0) return null;
    
    const totalWasteFraction = portionsWithWaste.reduce(
      (sum, p) => sum + p.waste!.quantity_wasted_as_fraction_of_served, 
      0
    );
    
    return (totalWasteFraction / portionsWithWaste.length) * 100;
  };
  
  // Handle deleting a meal
  const handleDeleteMeal = async (servingId: string) => {
    if (!user) return;

    const mealToDelete = foodServings.find(entry => entry.serving.id === servingId);
    if (!mealToDelete) {
      toast.error("Meal not found.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the meal "${mealToDelete.serving.meal_name}"? This will also delete all its associated portions and waste logs.`
    );

    if (!confirmDelete) return;

    setIsLoading(true);

    try {
      // 1. Get all served_portion_ids for the serving
      const portionIds = mealToDelete.portions.map(p => p.id);

      // 2. Delete all food_waste_entries associated with these portions
      if (portionIds.length > 0) {
        const { error: deleteWasteError } = await supabase
          .from('food_waste_entries')
          .delete()
          .in('served_portion_id', portionIds)
          .eq('user_id', user.id);
        if (deleteWasteError) throw new Error(`Error deleting waste entries: ${deleteWasteError.message}`);
      }

      // 3. Delete all served_portions associated with the serving
      const { error: deletePortionsError } = await supabase
        .from('served_portions')
        .delete()
        .eq('serving_id', servingId)
        .eq('user_id', user.id);
      if (deletePortionsError) throw new Error(`Error deleting portions: ${deletePortionsError.message}`);

      // 4. Delete the food_serving itself
      const { error: deleteServingError } = await supabase
        .from('food_servings')
        .delete()
        .eq('id', servingId)
        .eq('user_id', user.id);
      if (deleteServingError) throw new Error(`Error deleting serving: ${deleteServingError.message}`);

      toast.success(`Meal "${mealToDelete.serving.meal_name}" and all associated data deleted successfully!`);

      // Refresh data
      fetchFoodServings();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting meal.';
      console.error("Detailed error in handleDeleteMeal:", error);
      toast.error("Failed to delete meal.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Helmet>
        <title>Log Your Food Waste - Forkprint</title>
        <meta name="description" content="Easily log your food waste and gain insights into your consumption patterns with Forkprint." />
      </Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Food Waste Logger</h1>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Meal Form */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Log a Meal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meal-date">Meal Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!selectedMealDate && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedMealDate ? format(selectedMealDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedMealDate}
                      onSelect={setSelectedMealDate}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="meal-name">Meal Name</Label>
                <Select 
                  value={mealName} 
                  onValueChange={(value) => setMealName(value)}
                >
                  <SelectTrigger id="meal-name">
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="meal-notes">Notes (Optional)</Label>
                <Textarea 
                  id="meal-notes" 
                  value={mealNotes} 
                  onChange={(e) => setMealNotes(e.target.value)}
                  placeholder="Any additional notes about this meal..."
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Food Items</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addPortion}
                    disabled={isLoading}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {portions.map((portion, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        value={portion.name}
                        onChange={(e) => updatePortion(index, 'name', e.target.value)}
                        placeholder="Food name (e.g., Apple)"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={portion.quantity}
                        onChange={(e) => updatePortion(index, 'quantity', e.target.value)}
                        placeholder="#"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={portion.unit}
                        onChange={(e) => updatePortion(index, 'unit', e.target.value)}
                        placeholder="Unit (e.g., serving)"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removePortion(index)}
                        disabled={isLoading || portions.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="col-span-12">
                      <Input 
                        value={portion.description} 
                        onChange={(e) => updatePortion(index, 'description', e.target.value)}
                        placeholder="Description (e.g., 'Full plate', 'Half sandwich')"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleAddMeal}
                disabled={isLoading}
              >
                Log Meal
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Stats and Charts */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Waste Trends
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="waste-time-range" className="text-sm font-medium">
                Time Range:
              </Label>
              <Select value={chartTimeRange} onValueChange={(value: 'week' | 'month' | '3months' | 'year') => setChartTimeRange(value)}>
                <SelectTrigger id="waste-time-range" className="w-[140px]">
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
          </CardHeader>
          <CardContent>
            {filteredChartData.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground mb-2 space-y-1">
                  {generateInsightsAndTips(wasteSummaryData).map((insight, idx) => (
                    <p key={idx} className={
                      insight.type === 'encouragement' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-orange-600' :
                      'text-blue-600' // for tips
                    }>
                      {insight.message}
                    </p>
                  ))}
                </div>
                <div className="h-[300px] mt-4">
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
                      <YAxis domain={[0, 100]} label={{ value: '% Consumed', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value) => {
                          if (typeof value === 'number') {
                            return [`${value.toFixed(1)}%`, 'Food Consumed'];
                          }
                          return [String(value), 'Food Consumed'];
                        }}
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
                        dataKey="percentage_consumed"
                        name="Food Consumed"
                        stroke="#4ade80"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <p className="text-lg font-medium mb-2">
                  {wasteSummaryData.length > 0 ? 'No data for selected range' : 'No waste data yet'}
                </p>
                <p className="text-muted-foreground">
                  {wasteSummaryData.length > 0 
                    ? `No data available for the selected time range (${chartTimeRange}). Try expanding your time range.`
                    : 'Log your meals and waste to see your trends over time'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Meals List */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Recent Meals</h2>
        
        {foodServings.length > 0 ? (
          <div className="space-y-4">
            {foodServings.map((entry) => (
              <Card key={entry.serving.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-medium">{entry.serving.meal_name}</h3>
                    <p className="text-muted-foreground">
                      {new Date(entry.serving.served_at).toLocaleString()}
                    </p>
                    {entry.serving.notes && (
                      <p className="text-sm mt-1">{entry.serving.notes}</p>
                    )}
                  </div>
                  
                  <div className="mt-2 md:mt-0 flex items-center gap-2">
                    {/* Display waste percentage if available */}
                    {entry.portions.some(p => p.waste) && (
                      <div className="text-sm">
                        Waste: <span className="font-medium">{calculateWastePercentage(entry)?.toFixed(1)}%</span>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSelectServingForWaste(entry.serving.id)}
                    >
                      {entry.portions.some(p => p.waste) ? 'Edit Waste Log' : 'Log Waste'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMeal(entry.serving.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {entry.portions.map((portion) => (
                    <div key={portion.id} className="p-2 bg-muted rounded-md">
                      <div className="font-medium">{portion.custom_food_item_name}</div>
                      <div className="text-sm">
                        {portion.quantity_served} {portion.unit_served}
                        {portion.description && ` - ${portion.description}`}
                      </div>
                      {portion.waste && (
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                          <div>
                            <span className="font-medium">
                              {(portion.waste.quantity_wasted_as_fraction_of_served * 100).toFixed(0)}% wasted
                            </span>
                            {portion.waste.user_waste_description && `: ${portion.waste.user_waste_description}`}
                          </div>
                          {portion.waste.waste_reason && (
                            <div>
                              <span className="font-semibold">Reason:</span> {portion.waste.waste_reason}
                            </div>
                          )}
                          {portion.waste.disposal_action_taken && (
                            <div>
                              <span className="font-semibold">Disposal:</span> {portion.waste.disposal_action_taken}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border rounded-lg">
            <p className="text-muted-foreground">No meals logged yet. Start by logging your first meal!</p>
          </div>
        )}
      </div>
      
      {/* Waste Logging Modal */}
      {selectedServingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Log Food Waste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wasteEntries.map((entry, index) => {
                  const portion = foodServings
                    .find(s => s.serving.id === selectedServingId)?.portions
                    .find(p => p.id === entry.portionId);
                    
                  if (!portion) return null;
                  
                  return (
                    <div key={entry.portionId} className="border p-4 rounded-lg">
                      <h3 className="font-medium mb-2">{portion.custom_food_item_name}</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>How much was wasted? (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={entry.wastedFraction}
                            onChange={(e) => updateWasteEntry(index, 'wastedFraction', e.target.value)}
                            placeholder="e.g., 25"
                          />
                        </div>
                        
                        <div>
                          <Label>Description</Label>
                          <Input 
                            value={entry.description}
                            onChange={(e) => updateWasteEntry(index, 'description', e.target.value)}
                            placeholder="e.g., Left 1/4 of rice"
                          />
                        </div>
                        
                        <div>
                          <Label>Reason for waste</Label>
                          <Select 
                            value={entry.reason}
                            onValueChange={(value) => updateWasteEntry(index, 'reason', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {wasteReasons.map(reason => (
                                <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {entry.reason === 'Other' && (
                            <Input 
                              value={entry.otherReason}
                              onChange={(e) => updateWasteEntry(index, 'otherReason', e.target.value)}
                              placeholder="Please specify other reason"
                              className="mt-2"
                            />
                          )}
                        </div>
                        
                        <div>
                          <Label>How was it disposed?</Label>
                          <Select 
                            value={entry.disposalMethod}
                            onValueChange={(value) => updateWasteEntry(index, 'disposalMethod', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select disposal method" />
                            </SelectTrigger>
                            <SelectContent>
                              {disposalMethods.map(method => (
                                <SelectItem key={method} value={method}>{method}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {entry.disposalMethod === 'Other' && (
                            <Input 
                              value={entry.otherDisposalMethod}
                              onChange={(e) => updateWasteEntry(index, 'otherDisposalMethod', e.target.value)}
                              placeholder="Please specify other disposal method"
                              className="mt-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setSelectedServingId(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveWaste} disabled={isLoading}>
                    Save Waste Log
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FoodWasteLoggerPage; 