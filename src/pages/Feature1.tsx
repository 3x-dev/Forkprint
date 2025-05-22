import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider'; // For user context
import { supabase } from '@/integrations/supabase/client';    // Supabase client
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { PlusCircle, Trash2, Edit3 } from 'lucide-react'; // Icons

// Mirror the structure from your Supabase table (after types are generated)
// This interface will be more robust once types.ts is updated.
interface FoodItem {
  id: string; // UUID from Supabase
  user_id?: string; // Will be set but not always needed in UI
  name: string;
  expiry_date: string; // Store as ISO string "YYYY-MM-DD"
  amount?: string | null; // Match Supabase (TEXT can be null)
  created_at?: string;
  updated_at?: string;
}

const FoodExpiryPage: React.FC = () => {
  const { user } = useAuthContext();
  const [itemName, setItemName] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // HTML input type="date" provides "YYYY-MM-DD"
  const [amount, setAmount] = useState('');
  const [fridgeItems, setFridgeItems] = useState<FoodItem[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [itemsOnSelectedDate, setItemsOnSelectedDate] = useState<FoodItem[]>([]);

  // Fetch food items from Supabase
  const fetchFridgeItems = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_items') // This will be type-safe after type generation
        .select('*')
        .eq('user_id', user.id)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setFridgeItems(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to fetch fridge items.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFridgeItems();
  }, [user]); // Re-fetch if user changes

  // Update items for selected calendar date
  useEffect(() => {
    if (selectedCalendarDate) {
      const normalizedSelectedDateStr = selectedCalendarDate.toISOString().split('T')[0];
      const items = fridgeItems.filter(item => item.expiry_date === normalizedSelectedDateStr);
      setItemsOnSelectedDate(items);
    } else {
      setItemsOnSelectedDate([]);
    }
  }, [selectedCalendarDate, fridgeItems]);
  
  // Notification Logic (runs when fridgeItems are loaded/changed)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    fridgeItems.forEach(item => {
      // expiry_date from DB is "YYYY-MM-DD". Need to parse correctly.
      const expiry = new Date(item.expiry_date + 'T00:00:00'); // Assume local timezone for date string
      expiry.setHours(0,0,0,0);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) { 
        toast.warning(`"${item.name}" is expiring ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`}!`, {
          description: `Expiry Date: ${new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}`,
          // action: { // Consider if an action is still needed or how it should behave
          //   label: "View Item",
          //   onClick: () => console.log(`User wants to view ${item.name}`),
          // },
        });
      }
    });
  }, [fridgeItems]);

  const handleAddItem = async () => {
    if (!user) {
      toast.error("You must be logged in to add items.");
      return;
    }
    if (!itemName || !expiryDate) {
      toast.error("Please enter item name and expiry date.");
      return;
    }
    setIsLoading(true);
    try {
      const newItemPayload = {
        user_id: user.id,
        name: itemName,
        expiry_date: expiryDate, // Directly use "YYYY-MM-DD"
        amount: amount || null,
      };
      // After type generation, (supabase.from('food_items') as any) can be just supabase.from('food_items')
      const { data, error } = await supabase
        .from('food_items')
        .insert(newItemPayload)
        .select()
        .single(); // Assuming you want the single inserted item back

      if (error) throw error;
      
      if (data) {
        // Type assertion might be needed if 'data' is not perfectly typed yet
        setFridgeItems(prevItems => [...prevItems, data as FoodItem].sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()));
        toast.success(`"${itemName}" added to your fridge!`);
        setItemName('');
        setExpiryDate('');
        setAmount('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to add item.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id); // Ensure user can only delete their own items

      if (error) throw error;

      setFridgeItems(prevItems => prevItems.filter(item => item.id !== itemId));
      toast.success(`"${itemName}" deleted.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to delete item.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar Modifiers
  const expiryDateModifiers = {
    expiredOrSoon: fridgeItems.map(item => new Date(item.expiry_date + 'T00:00:00')) // Ensure dates are parsed correctly
  };
  
  const expiryDateModifierStyles = {
    expiredOrSoon: { // This style will apply to all dates in the `expiredOrSoon` array
      color: 'white',
      backgroundColor: '#F87171', // Red-400
      borderRadius: '50%',
    },
    // You can add more specific styles, e.g., for 'today' or 'selected'
    // selected: { backgroundColor: '#3B82F6', color: 'white' }, // Example for selected day
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedCalendarDate(date); // This will trigger the useEffect to update itemsOnSelectedDate
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Food Expiry Tracker</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Column 1: Add Item Form & Items for Selected Date */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add New Item</h2>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="itemName" className="text-sm font-medium text-gray-600">Item Name</Label>
                        <Input id="itemName" type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Milk" className="mt-1"/>
                    </div>
                    <div>
                        <Label htmlFor="expiryDate" className="text-sm font-medium text-gray-600">Expiry Date</Label>
                        <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1"/>
                    </div>
                    <div>
                        <Label htmlFor="amount" className="text-sm font-medium text-gray-600">Amount (Optional)</Label>
                        <Input id="amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 1 Gallon, 200g" className="mt-1"/>
                    </div>
                    <Button onClick={handleAddItem} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <PlusCircle className="h-5 w-5 mr-2" /> {isLoading ? 'Adding...' : 'Add to Fridge'}
                    </Button>
                </div>
            </div>

            {/* Display items for selected calendar date */}
            <div className="bg-white p-6 shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">
                    Items Expiring on {selectedCalendarDate ? new Date(selectedCalendarDate.toISOString().split('T')[0] + 'T00:00:00').toLocaleDateString() : '...'}
                </h2>
                {isLoading && itemsOnSelectedDate.length === 0 && <p className="text-gray-500">Loading...</p>}
                {!isLoading && itemsOnSelectedDate.length === 0 && <p className="text-gray-500">No items expiring on this date.</p>}
                {itemsOnSelectedDate.length > 0 && (
                    <ul className="space-y-2">
                        {itemsOnSelectedDate.map(item => (
                            <li key={item.id} className="text-sm p-2 border-b border-gray-100">
                                <span className="font-medium text-gray-800">{item.name}</span>
                                {item.amount && <span className="text-gray-600 text-xs"> ({item.amount})</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Column 2: Fridge Contents & Calendar */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Your Fridge Contents</h2>
                {isLoading && fridgeItems.length === 0 && <p className="text-gray-500">Loading your fridge...</p>}
                {!isLoading && fridgeItems.length === 0 && <p className="text-gray-500">Your fridge is empty. Add some items!</p>}
                {fridgeItems.length > 0 && (
                    <ul className="space-y-3 max-h-96 overflow-y-auto"> {/* Added scroll for long lists */}
                    {fridgeItems.map(item => (
                        <li key={item.id} className="p-3 border border-gray-200 rounded-md shadow-sm flex justify-between items-center hover:bg-gray-50">
                        <div>
                            <h3 className="font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-600">Expires: {new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}</p>
                            {item.amount && <p className="text-sm text-gray-500">Amount: {item.amount}</p>}
                        </div>
                        <div className="flex space-x-2">
                            {/* <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => alert(`Edit ${item.name}`)} title="Edit Item">
                                <Edit3 className="h-4 w-4" />
                            </Button> */}
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id, item.name)} disabled={isLoading} title="Delete Item">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        </li>
                    ))}
                    </ul>
                )}
            </div>
            
            <div className="bg-white p-6 shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Expiry Calendar</h2>
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedCalendarDate}
                        onSelect={handleDateSelect}
                        className="rounded-md border"
                        modifiers={expiryDateModifiers}
                        modifiersStyles={expiryDateModifierStyles}
                        disabled={isLoading} // Disable calendar while loading
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">Notification System Notes</h2>
        <p className="text-gray-600 text-sm">
          - You'll receive in-app toast notifications for items expiring within 3 days (including today).
          <br />
          - This check runs when items are loaded or modified.
          <br />
          - For more advanced background notifications or email/SMS, a backend process would be needed.
        </p>
      </div>
    </div>
  );
};

export default FoodExpiryPage; 