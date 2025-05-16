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
}

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
        setCurrentLogItemForSwitch(newLog); // Set current log for modal
        setIsSwitchModalOpen(true); // Open modal
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-2">Plastic-Free Packaging Swapper</h1>
      <p className="text-gray-600 mb-6">
        For 5–7 days, try to buy foods with low-waste or no plastic packaging. Log your purchases below.
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
                placeholder="e.g., Bought from farmers market, brand name" 
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

        <h2 className="text-2xl font-semibold mb-4">Your Logged Items</h2>
        {isLoading && userLogs.length === 0 && <p>Loading your logs...</p>}
        {!isLoading && userLogs.length === 0 && <p>You haven't logged any items yet. Start by adding a purchase above!</p>}
        
        {userLogs.length > 0 && (
          <div className="space-y-4">
            {userLogs.map((log) => (
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
                  {/* TODO: Display photos and switch info */}
                  {log.made_switch && (
                    <p className="text-sm text-blue-600 mt-1">
                      Switched from: {log.previous_item_description || 'an older product'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
};

export default PackagingSwapPage; 