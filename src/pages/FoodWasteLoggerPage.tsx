import * as React from 'react';
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
import { PlusCircle, Trash2, BarChart, Utensils, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  }[]>([{ name: '', quantity: '1', unit: 'serving', description: '' }]);
  
  // Waste logging states
  const [selectedServingId, setSelectedServingId] = useState<string | null>(null);
  const [wasteEntries, setWasteEntries] = useState<{
    portionId: string;
    wastedFraction: string;
    description: string;
    reason: string;
    disposalMethod: string;
  }[]>([]);
  
  // Data states
  const [foodServings, setFoodServings] = useState<FoodWasteLogEntry[]>([]);
  const [wasteSummaryData, setWasteSummaryData] = useState<WasteSummary[]>([]);
  const [showStats, setShowStats] = useState(false);
  
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
    const dailyData: Record<string, { totalConsumed: number, totalItems: number }> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.serving.served_at).toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = { totalConsumed: 0, totalItems: 0 };
      }
      
      entry.portions.forEach(portion => {
        dailyData[date].totalItems++;
        
        if (portion.waste) {
          const consumedFraction = 1 - portion.waste.quantity_wasted_as_fraction_of_served;
          dailyData[date].totalConsumed += consumedFraction;
        } else {
          // If no waste entry, assume fully consumed
          dailyData[date].totalConsumed++;
        }
      });
    });
    
    // Convert to array for chart
    const summaryData: WasteSummary[] = Object.entries(dailyData).map(([date, data]) => ({
      date,
      percentage_consumed: (data.totalConsumed / data.totalItems) * 100
    }));
    
    // Sort by date
    summaryData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setWasteSummaryData(summaryData);
  };
  
  useEffect(() => {
    if (user) {
      fetchFoodServings();
    }
  }, [user]);
  
  // Add a portion field to the form
  const addPortion = () => {
    setPortions([...portions, { name: '', quantity: '1', unit: 'serving', description: '' }]);
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
    
    if (portions.some(p => !p.name || !p.quantity)) {
      toast.error("Please complete all portion fields.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 1. Create the serving
      const { data: servingData, error: servingError } = await supabase
        .from('food_servings')
        .insert({
          user_id: user.id,
          meal_name: mealName,
          notes: mealNotes || null,
          served_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (servingError) throw servingError;
      
      // 2. Create each portion
      for (const portion of portions) {
        const { error: portionError } = await supabase
          .from('served_portions')
          .insert({
            serving_id: servingData.id,
            user_id: user.id,
            custom_food_item_name: portion.name,
            quantity_served: parseFloat(portion.quantity),
            unit_served: portion.unit,
            description: portion.description || null
          });
          
        if (portionError) throw portionError;
      }
      
      toast.success(`Meal "${mealName}" added successfully!`);
      
      // Reset form
      setMealName('');
      setMealNotes('');
      setPortions([{ name: '', quantity: '1', unit: 'serving', description: '' }]);
      
      // Refresh data
      fetchFoodServings();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to add meal.", { description: errorMessage });
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
        wastedFraction: portion.waste ? portion.waste.quantity_wasted_as_fraction_of_served.toString() : '0',
        description: portion.waste?.user_waste_description || '',
        reason: portion.waste?.waste_reason || wasteReasons[0],
        disposalMethod: portion.waste?.disposal_action_taken || disposalMethods[0]
      }));
      
      setWasteEntries(initialWasteEntries);
    }
  };
  
  // Update a waste entry field
  const updateWasteEntry = (index: number, field: string, value: string) => {
    const updatedEntries = [...wasteEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setWasteEntries(updatedEntries);
  };
  
  // Handle saving waste entries
  const handleSaveWaste = async () => {
    if (!user || !selectedServingId) return;
    
    setIsLoading(true);
    
    try {
      for (const entry of wasteEntries) {
        const fraction = Math.min(Math.max(parseFloat(entry.wastedFraction) || 0, 0), 1);
        
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
              waste_reason: entry.reason,
              disposal_action_taken: entry.disposalMethod
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
              waste_reason: entry.reason,
              disposal_action_taken: entry.disposalMethod
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
  
  // Generate encouragement message based on waste percentage
  const generateEncouragementMessage = (wastePercentage: number | null) => {
    if (wastePercentage === null) return "Log your waste to see your progress!";
    
    const consumedPercentage = 100 - wastePercentage;
    
    if (consumedPercentage >= 95) return "Perfect! You finished all your food!";
    if (consumedPercentage >= 90) return `Nice! You finished ${Math.round(consumedPercentage)}% of your food today.`;
    if (consumedPercentage >= 75) return `Good job! You consumed ${Math.round(consumedPercentage)}% of your food.`;
    if (consumedPercentage >= 50) return `You consumed ${Math.round(consumedPercentage)}% of your food. Can you do better next time?`;
    return `You only consumed ${Math.round(consumedPercentage)}% of your food. Let's try to reduce waste next time!`;
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
                        placeholder="Food name"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        min="0.1"
                        step="0.1"
                        value={portion.quantity} 
                        onChange={(e) => updatePortion(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        value={portion.unit} 
                        onChange={(e) => updatePortion(index, 'unit', e.target.value)}
                        placeholder="Unit"
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
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Your Food Waste Stats
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? 'Hide Chart' : 'Show Chart'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wasteSummaryData.length > 0 ? (
              <>
                {/* Encouragement message based on recent performance */}
                <div className="p-4 bg-muted rounded-lg mb-6 text-center">
                  <p className="text-lg font-medium">
                    {generateEncouragementMessage(
                      wasteSummaryData.length > 0 
                        ? 100 - wasteSummaryData[wasteSummaryData.length - 1].percentage_consumed 
                        : null
                    )}
                  </p>
                </div>
                
                {/* Waste chart */}
                {showStats && (
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wasteSummaryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis domain={[0, 100]} label={{ value: '% Consumed', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value) => {
                            if (typeof value === 'number') {
                              return [`${value.toFixed(1)}%`, 'Food Consumed'];
                            }
                            return [String(value), 'Food Consumed'];
                          }}
                          labelFormatter={(date) => new Date(date).toLocaleDateString()}
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
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <p className="text-lg font-medium mb-2">No waste data yet</p>
                <p className="text-muted-foreground">Log your meals and waste to see your trends over time</p>
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
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">
                            {(portion.waste.quantity_wasted_as_fraction_of_served * 100).toFixed(0)}% wasted
                          </span>
                          {portion.waste.user_waste_description && `: ${portion.waste.user_waste_description}`}
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
                          <Label>How much was wasted?</Label>
                          <Select 
                            value={entry.wastedFraction}
                            onValueChange={(value) => updateWasteEntry(index, 'wastedFraction', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select waste amount" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None (0%)</SelectItem>
                              <SelectItem value="0.25">Quarter (25%)</SelectItem>
                              <SelectItem value="0.5">Half (50%)</SelectItem>
                              <SelectItem value="0.75">Three quarters (75%)</SelectItem>
                              <SelectItem value="1">All (100%)</SelectItem>
                            </SelectContent>
                          </Select>
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