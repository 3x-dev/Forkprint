import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Added import
import { useAuthContext } from '@/components/auth/AuthProvider'; // For user context
import { supabase } from '@/integrations/supabase/client';    // Supabase client
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { PlusCircle, Trash2, Edit3, ImageOff, ChevronDown, ChevronUp, ChefHat, ArrowLeft, Trash } from 'lucide-react'; // Icons
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area"; // For scrollable recipe content
import { Lightbulb } from 'lucide-react'; // Icon for suggest recipes button
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"; // For recipe cards

// Mirror the structure from your Supabase table (after types are generated)
// This interface will be more robust once types.ts is updated.
interface FoodItem {
  id: string; // UUID from Supabase
  user_id?: string; // Will be set but not always needed in UI
  name: string;
  expiry_date: string; // Store as ISO string "YYYY-MM-DD"
  amount?: string | null; // Match Supabase (TEXT can be null)
  image_url?: string | null; // New field for the image URL
  created_at?: string;
  updated_at?: string;
}

interface RecipeDetail {
  id: string; // Unique ID for the recipe, can be index or generated
  name: string;
  description: string;
  ingredients: string; // Markdown string
  instructions: string; // Markdown string
  isExpanded?: boolean;
  source?: 'api' | 'cache'; // To differentiate if needed
  cachedAt?: string; // If from cache
}

// Spoonacular API Key from environment variables
const SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const SPOONACULAR_IMAGE_BASE_URL = "https://spoonacular.com/cdn/ingredients_100x100/"; // Or _250x250 / _500x500

// Updated for OpenRouter
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Define your site URL and app name (can be placeholders for local dev)
const YOUR_SITE_URL = window.location.origin; // Or your deployed site URL
const YOUR_APP_NAME = "Forkprint"; // Or your app's name

// Helper function to create a consistent key from ingredient names
const generateIngredientsKey = (itemNames: string[]): string => {
  return [...itemNames].sort().join(',').toLowerCase();
};

// Enhanced Parsing Function
const parseRecipesMarkdown = (markdown: string, source: 'api' | 'cache', cachedAt?: string): RecipeDetail[] => {
    if (!markdown) return [];
    const recipeBlocks = markdown.split('%%%---RECIPE_SEPARATOR---%%%');
    const recipes: RecipeDetail[] = [];

    recipeBlocks.forEach((block, index) => {
        if (block.trim() === "") return;

        let name = `Recipe ${index + 1}`;
        let description = "No description provided.";
        let ingredients = "No ingredients listed.";
        let instructions = "No instructions provided.";

        // Attempt to extract name (## Recipe Name)
        const nameMatch = block.match(/^##\s*(.*)/m);
        if (nameMatch && nameMatch[1]) {
            name = nameMatch[1].trim();
        }
        
        // Description: Heuristic - first paragraph after name (or start if no name) until "Ingredients"
        const descriptionMatch = block.match(/(?:^##\s*.*\n)?([\s\S]*?)(Ingredients:|Instructions:|$)/im);
        if (descriptionMatch && descriptionMatch[1] && descriptionMatch[1].trim() !== "") {
            description = descriptionMatch[1].trim();
        }


        // Ingredients: text between "Ingredients:" and "Instructions:"
        const ingredientsMatch = block.match(/Ingredients:([\s\S]*?)Instructions:/im);
        if (ingredientsMatch && ingredientsMatch[1]) {
            ingredients = ingredientsMatch[1].trim();
        } else { // Fallback if "Instructions:" is missing but "Ingredients:" exists
            const ingredientsOnlyMatch = block.match(/Ingredients:([\s\S]*)/im);
            if (ingredientsOnlyMatch && ingredientsOnlyMatch[1]) {
                ingredients = ingredientsOnlyMatch[1].trim();
            }
        }

        // Instructions: text after "Instructions:"
        const instructionsMatch = block.match(/Instructions:([\s\S]*)/im);
        if (instructionsMatch && instructionsMatch[1]) {
            instructions = instructionsMatch[1].trim();
        }
        
        // Clean up description from potential ingredient/instruction keywords if they were not separators
        if(description.toLowerCase().includes("ingredients:")) description = description.substring(0, description.toLowerCase().indexOf("ingredients:")).trim();
        if(description.toLowerCase().includes("instructions:")) description = description.substring(0, description.toLowerCase().indexOf("instructions:")).trim();


        recipes.push({
            id: `${source}-${Date.now()}-${index}`, // Simple unique ID
            name,
            description,
            ingredients,
            instructions,
            isExpanded: false,
            source,
            cachedAt: source === 'cache' ? cachedAt : undefined
        });
    });
    return recipes;
};

const FRESH_FETCH_COOLDOWN_MS = 30000; // 30 seconds cooldown for fresh fetches
const MAX_INGREDIENTS_FOR_LLM = 15; // Max ingredients to send to LLM

const FoodExpiryPage: React.FC = () => {
  const { user } = useAuthContext();
  const [itemName, setItemName] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // HTML input type="date" provides "YYYY-MM-DD"
  const [amount, setAmount] = useState('');
  const [fridgeItems, setFridgeItems] = useState<FoodItem[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [itemsOnSelectedDate, setItemsOnSelectedDate] = useState<FoodItem[]>([]);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [suggestedRecipesList, setSuggestedRecipesList] = useState<RecipeDetail[]>([]);
  const [isFetchingRecipes, setIsFetchingRecipes] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [lastFreshFetchTime, setLastFreshFetchTime] = useState<number | null>(null);
  const [initialCacheLoadAttempted, setInitialCacheLoadAttempted] = useState(false);
  const [expiredItems, setExpiredItems] = useState<FoodItem[]>([]);
  
  // Edit functionality state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Disposal guidance state
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedDisposalItem, setSelectedDisposalItem] = useState<FoodItem | null>(null);
  const [disposalGuidance, setDisposalGuidance] = useState<string>('');
  const [isFetchingDisposal, setIsFetchingDisposal] = useState(false);

  // Fetch food items from Supabase
  const fetchFridgeItems = async () => {
    if (!user) return;
    setIsLoading(true);
    setInitialCacheLoadAttempted(false); // Reset when fetching new fridge items
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
      setFridgeItems([]); // Ensure fridgeItems is an array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!SPOONACULAR_API_KEY) {
        console.warn("Spoonacular API key is not set. Image fetching will be disabled.");
        toast.warning("Image fetching disabled: Spoonacular API key missing.", {
            description: "Please set VITE_SPOONACULAR_API_KEY in your .env file."
        });
    }
    // Updated for OpenRouter
    if (!OPENROUTER_API_KEY) {
        console.warn("OpenRouter API key is not set. Recipe suggestions will be disabled.");
        toast.warning("Recipe suggestions disabled: OpenRouter API key missing.",{
            description: "Please set VITE_OPENROUTER_API_KEY in your .env file."
        });
    }
    fetchFridgeItems();
  }, [user]); // Re-fetch if user changes

  // useEffect to load cached recipes when fridgeItems or user changes
  useEffect(() => {
    const loadInitialCachedRecipes = async () => {
        if (!user || fridgeItems.length === 0 || isLoading || !OPENROUTER_API_KEY || initialCacheLoadAttempted) {
            // Don't load if no user, no items, main data is loading, no API key for suggestions, or already attempted
            if (fridgeItems.length === 0 && !isLoading) setInitialCacheLoadAttempted(true); // Mark as attempted if fridge is empty and not loading
            return;
        }

        // Prevent re-triggering if fetchingRecipes is already true from a manual click
        if (isFetchingRecipes) return; 

        const nonExpiredItems = fridgeItems.filter(item => {
            const expiry = new Date(item.expiry_date + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return expiry >= today;
        });

        if (nonExpiredItems.length === 0) {
            setSuggestedRecipesList([]); // Clear if no non-expired items
            setInitialCacheLoadAttempted(true);
            return;
        }
        
        let itemNamesArray = nonExpiredItems.map(item => item.name);
        // Apply the same MAX_INGREDIENTS_FOR_LLM logic for cache key consistency
        if (itemNamesArray.length > MAX_INGREDIENTS_FOR_LLM) {
            itemNamesArray = itemNamesArray.slice(0, MAX_INGREDIENTS_FOR_LLM);
        }
        const currentIngredientsKey = generateIngredientsKey(itemNamesArray);

        // console.log("Attempting to load initial cached recipes for key:", currentIngredientsKey);
        // setIsFetchingRecipes(true); // Indicate loading for recipes, even if cached
        try {
            const { data: cachedData, error: cacheError } = await supabase
                .from('recipe_suggestions')
                .select('recipes_markdown, created_at')
                .eq('user_id', user.id)
                .eq('ingredients_key', currentIngredientsKey)
                .maybeSingle();

            setInitialCacheLoadAttempted(true); // Mark that we've tried

            if (cacheError) {
                 console.error("Error fetching initial cached recipes:", cacheError.message);
                 // Don't throw, just means no cache or DB error
            }

            if (cachedData) {
                // console.log("Found initial cached recipes:", cachedData);
                const parsedCache = parseRecipesMarkdown(cachedData.recipes_markdown, 'cache', new Date(cachedData.created_at).toLocaleDateString());
                setSuggestedRecipesList(parsedCache);
                toast.info("Previously suggested recipes loaded from cache.", {duration: 4000});
            } else {
                // console.log("No initial cached recipes found for this set of ingredients.");
                setSuggestedRecipesList([]); // Ensure list is empty if no cache
            }
        } catch (error) {
            console.error("Unexpected error fetching initial cached recipes:", error);
            setSuggestedRecipesList([]);
        } finally {
            // setIsFetchingRecipes(false);
        }
    };
    
    // Only run if fridgeItems have been loaded (isLoading is false) and user exists
    if (!isLoading && user && fridgeItems) {
        loadInitialCachedRecipes();
    }

  }, [fridgeItems, user, isLoading, OPENROUTER_API_KEY]); // Depend on fridgeItems, user, and isLoading

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
  
  // useEffect to update expiredItems list
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentlyExpired = fridgeItems.filter(item => {
      const expiry = new Date(item.expiry_date + 'T00:00:00');
      return expiry < today;
    }).sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()); // Show oldest expired first
    setExpiredItems(currentlyExpired);
  }, [fridgeItems]);

  // Notification Logic (runs when fridgeItems are loaded/changed)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    fridgeItems.forEach(item => {
      const expiry = new Date(item.expiry_date + 'T00:00:00'); 
      expiry.setHours(0,0,0,0);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) { // Item has expired
        toast.error(`"${item.name}" has expired!`, {
          description: `Expired on: ${new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}. Please dispose of it properly.`,
          // You could add an action here to link to composting/disposal guidelines later
          // action: {
          //   label: "Disposal Tips",
          //   onClick: () => console.log(`Show disposal tips for ${item.name}`),
          // },
        });
      } else if (diffDays >= 0 && diffDays <= 3) { // Item is expiring soon (today or in 1-3 days)
        toast.warning(`"${item.name}" is expiring ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`}!`, {
          description: `Expiry Date: ${new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}`,
        });
      }
    });
  }, [fridgeItems]);

  const fetchFoodImageFromName = async (name: string): Promise<string | null> => {
    if (!SPOONACULAR_API_KEY) return null;
    // Basic normalization: trim and take first few words if very long.
    // More sophisticated normalization could be added (e.g. lowercase, remove plurals, common adjectives)
    const searchTerm = name.trim().toLowerCase();
    const query = encodeURIComponent(searchTerm.split(' ').slice(0, 3).join(' ')); // Use first 3 words for search
    
    try {
      const response = await fetch(
        `https://api.spoonacular.com/food/ingredients/search?query=${query}&number=1&apiKey=${SPOONACULAR_API_KEY}`
      );
      if (!response.ok) {
        console.error("Spoonacular API error:", response.status, await response.text());
        return null;
      }
      const data = await response.json();
      if (data.results && data.results.length > 0 && data.results[0].image) {
        return SPOONACULAR_IMAGE_BASE_URL + data.results[0].image;
      }
      return null;
    } catch (error) {
      console.error("Error fetching image from Spoonacular:", error);
      return null;
    }
  };

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
    let newItemId: string | null = null;
    let addedItemData: FoodItem | null = null;

    try {
      const newItemPayload = {
        user_id: user.id,
        name: itemName,
        expiry_date: expiryDate,
        amount: amount || null,
        image_url: null, // Initially null, will be updated after image fetch
      };
      // After type generation, (supabase.from('food_items') as any) can be just supabase.from('food_items')
      const { data: insertedData, error: insertError } = await supabase
        .from('food_items')
        .insert(newItemPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData) throw new Error("Failed to retrieve inserted item data.");
      
      addedItemData = insertedData as FoodItem;
      newItemId = addedItemData.id;

      toast.success(`"${itemName}" added. Fetching image...`);
      setItemName('');
      setExpiryDate('');
      setAmount('');

      // Fetch image and update
      const imageUrl = await fetchFoodImageFromName(addedItemData.name);
      if (imageUrl && newItemId) {
        const { data: updatedData, error: updateError } = await supabase
          .from('food_items')
          .update({ image_url: imageUrl })
          .eq('id', newItemId)
          .select()
          .single();
        
        if (updateError) {
            toast.error("Failed to save image URL.", {description: updateError.message});
        } else if (updatedData) {
            addedItemData = updatedData as FoodItem; // Use the fully updated item
            toast.info(`Image found for "${addedItemData.name}"!`);
        }
      } else {
          toast.info(`No image found for "${addedItemData.name}", or API key missing.`);
      }
      
      // Update local state with the potentially image-updated item
      if(addedItemData) {
          setFridgeItems(prevItems => 
            [...prevItems, addedItemData as FoodItem].sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
          );
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

  const handleEditExpiryDate = (item: FoodItem) => {
    setEditingItemId(item.id);
    setEditExpiryDate(item.expiry_date);
    setEditAmount(item.amount || '');
  };

  const handleSaveExpiryDate = async (itemId: string, itemName: string) => {
    if (!user || !editExpiryDate) return;

    setIsLoading(true);
    try {
      const updateData: { expiry_date: string; amount?: string | null } = {
        expiry_date: editExpiryDate
      };
      
      // Update amount (allow clearing it by setting to null if empty)
      updateData.amount = editAmount.trim() || null;

      const { error } = await supabase
        .from('food_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setFridgeItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, expiry_date: editExpiryDate, amount: editAmount.trim() || null }
            : item
        ).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      );

      setEditingItemId(null);
      setEditExpiryDate('');
      setEditAmount('');
      toast.success(`Updated "${itemName}".`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to update item.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditExpiryDate('');
    setEditAmount('');
  };

  // Disposal Guidance Function
  const getDisposalGuidance = async (item: FoodItem) => {
    if (!OPENROUTER_API_KEY) {
      toast.error("Disposal guidance feature is disabled.", { description: "OpenRouter API key is not configured." });
      return;
    }

    setSelectedDisposalItem(item);
    setIsDisposalModalOpen(true);
    setIsFetchingDisposal(true);
    setDisposalGuidance('');

    try {
      const expiry = new Date(item.expiry_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysPast = Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));

      const prompt = `
You are a food safety and disposal expert. Please provide detailed guidance for disposing of an expired food item.

Food Item: ${item.name}
Amount: ${item.amount || 'Not specified'}
Days Expired: ${daysPast} day${daysPast !== 1 ? 's' : ''}
Expiry Date: ${expiry.toLocaleDateString()}

Please provide comprehensive disposal guidance covering:

1. **Safety Assessment**: Is it safe to handle? What precautions should be taken?
2. **Visual/Smell Inspection**: What signs to look for (mold, discoloration, odor, etc.)?
3. **Disposal Method**: Should it go in trash, compost, or require special disposal?
4. **Health Risks**: What are the potential health risks if accidentally consumed?
5. **Environmental Considerations**: Best practices for eco-friendly disposal
6. **Prevention Tips**: How to avoid this situation in the future

Be specific about the food type and consider factors like:
- How long it's been expired
- Common spoilage patterns for this food
- Bacterial growth concerns
- Packaging considerations
- Local waste management best practices

Format your response in clear sections using markdown headers. Be practical, safety-focused, and environmentally conscious.
      `;

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': YOUR_SITE_URL,
          'X-Title': YOUR_APP_NAME,
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a food safety and disposal expert with knowledge of proper food waste management, composting, and safety protocols.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.3, // Lower temperature for more consistent, factual advice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenRouter API Error:", errorData);
        let errorMessage = `API request failed with status ${response.status}`;
        if (errorData && errorData.error && errorData.error.message) errorMessage = errorData.error.message;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        setDisposalGuidance(data.choices[0].message.content);
      } else {
        setDisposalGuidance("I couldn't generate disposal guidance at this time. Please consult local food safety guidelines or waste management resources.");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error fetching disposal guidance:", error);
      toast.error("Failed to fetch disposal guidance.", { description: errorMessage });
      setDisposalGuidance("Error loading disposal guidance. Please consult local food safety guidelines or waste management resources for proper disposal methods.");
    } finally {
      setIsFetchingDisposal(false);
    }
  };

  // Calendar Modifiers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const categorizedDates = fridgeItems.reduce((acc, item) => {
    const expiryDate = new Date(item.expiry_date + 'T00:00:00');
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Already expired
      acc.expired.push(expiryDate);
    } else if (diffDays <= 1) {
      // Today or tomorrow
      acc.urgent.push(expiryDate);
    } else if (diffDays <= 5) {
      // 3-5 days
      acc.warning.push(expiryDate);
    } else {
      // Later than 5 days
      acc.good.push(expiryDate);
    }
    return acc;
  }, { expired: [] as Date[], urgent: [] as Date[], warning: [] as Date[], good: [] as Date[] });

  const expiryDateModifiers = {
    expired: categorizedDates.expired,
    urgent: categorizedDates.urgent,
    warning: categorizedDates.warning,
    good: categorizedDates.good,
  };
  
  const expiryDateModifierStyles = {
    expired: {
      color: 'white',
      backgroundColor: '#7F1D1D', // Dark red (red-900)
      borderRadius: '50%',
      border: '2px solid #450A0A', // Even darker red border
      textDecoration: 'line-through',
    },
    urgent: {
      color: 'white',
      backgroundColor: '#DC2626', // Red (red-600)
      borderRadius: '50%',
    },
    warning: {
      color: 'black',
      backgroundColor: '#FACC15', // Yellow (yellow-400)
      borderRadius: '50%',
    },
    good: {
      color: 'white',
      backgroundColor: '#16A34A', // Green (green-600)
      borderRadius: '50%',
    },
  };

  const handleDateSelect = (date: Date | undefined) => {
    // Prevent deselecting - always keep a date selected
    if (date) {
      setSelectedCalendarDate(date); // This will trigger the useEffect to update itemsOnSelectedDate
    }
    // If date is undefined (deselection attempt), do nothing - keep current selection
  };

  const toggleRecipeExpansion = (recipeId: string) => {
    setExpandedRecipeId(prevId => (prevId === recipeId ? null : recipeId));
  };

  const handleSuggestRecipes = async (fetchNew = false) => {
    if (!OPENROUTER_API_KEY) {
      toast.error("Recipe suggestion feature is disabled.", { description: "OpenRouter API key is not configured." });
      return;
    }

    if (fetchNew) {
      const now = Date.now();
      if (lastFreshFetchTime && (now - lastFreshFetchTime < FRESH_FETCH_COOLDOWN_MS)) {
        const remainingCooldown = Math.ceil((FRESH_FETCH_COOLDOWN_MS - (now - lastFreshFetchTime)) / 1000);
        toast.info(`Please wait ${remainingCooldown}s before fetching fresh recipes again.`);
        return;
      }
    }

    let nonExpiredItems = fridgeItems.filter(item => {
      const expiry = new Date(item.expiry_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiry >= today;
    });

    if (nonExpiredItems.length === 0) {
      toast.info("No non-expired items in your fridge!", { description: "Add some items to get recipe suggestions." });
      setSuggestedRecipesList([]);
      return;
    }

    let itemNamesArray = nonExpiredItems.map(item => item.name);
    if (itemNamesArray.length > MAX_INGREDIENTS_FOR_LLM) {
      toast.info(`Showing recipes for the first ${MAX_INGREDIENTS_FOR_LLM} non-expired items to optimize suggestions.`, {duration: 6000});
      itemNamesArray = itemNamesArray.slice(0, MAX_INGREDIENTS_FOR_LLM);
      nonExpiredItems = nonExpiredItems.slice(0, MAX_INGREDIENTS_FOR_LLM); 
    }
    
    setIsFetchingRecipes(true); // Set true when actively fetching (cache or API)
    const currentIngredientsKey = generateIngredientsKey(itemNamesArray); 

    if (!fetchNew) { // Try cache first if not forcing new
        try {
            const { data: cachedData, error: cacheError } = await supabase
                .from('recipe_suggestions')
                .select('recipes_markdown, created_at')
                .eq('user_id', user!.id)
                .eq('ingredients_key', currentIngredientsKey)
                .maybeSingle();

            if (cacheError) throw cacheError;

            if (cachedData) {
                toast.success("Loaded cached recipe suggestions!");
                const parsedCache = parseRecipesMarkdown(cachedData.recipes_markdown, 'cache', new Date(cachedData.created_at).toLocaleDateString());
                setSuggestedRecipesList(parsedCache);
                setIsFetchingRecipes(false); // Done fetching
                return; 
            }
        } catch (error) {
            console.error("Error fetching cached recipes during manual suggest:", error);
        }
    }

    // Fetch from OpenRouter API
    toast.info(fetchNew ? "Fetching fresh recipes from AI..." : "No cached suggestions for these items. Fetching new recipes from AI...");
    const itemNamesString = itemNamesArray.join(', ');
    const prompt = `
      You are a helpful assistant that suggests recipes.
      Given the following food items currently in a fridge: ${itemNamesString}.

      Please suggest 2-3 simple recipes that primarily use these ingredients.
      For each recipe, provide:
      1. Recipe Name (as a markdown heading, e.g., ## Recipe Name)
      2. A brief, enticing description (1-2 sentences).
      3. Ingredients List: Clearly list all ingredients needed using markdown bullet points (e.g., - Ingredient 1).
         You can mention if an ingredient is from the provided list by adding (from fridge) next to it.
      4. Instructions: Provide clear, step-by-step numbered instructions (e.g., 1. Step one).

      Format the response clearly using Markdown.
      IMPORTANT: Between each complete recipe (name, description, ingredients, instructions),
      insert ONLY the following separator on its own line:
      %%%---RECIPE_SEPARATOR---%%%

      Ensure the recipes are relatively simple and common.
    `;
    try {
      const response = await fetch(OPENROUTER_API_URL, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': YOUR_SITE_URL,
                'X-Title': YOUR_APP_NAME,
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful recipe suggestion assistant.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 2000, 
                temperature: 0.7,
            }),
        });
      if (!response.ok) { 
            const errorData = await response.json();
            console.error("OpenRouter API Error:", errorData);
            let errorMessage = `API request failed with status ${response.status}`;
            if (errorData && errorData.error && errorData.error.message) errorMessage = errorData.error.message;
            throw new Error(errorMessage);
        }
      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const recipesMarkdown = data.choices[0].message.content;
        const newRecipes = parseRecipesMarkdown(recipesMarkdown, 'api');
        
        setSuggestedRecipesList(prevList => {
            const oldCachedRecipes = prevList.filter(r => r.source === 'cache' && r.id.startsWith('cache-')); // Ensure we only keep truly cached ones
            return [...newRecipes, ...oldCachedRecipes];
        });
        setExpandedRecipeId(null); 
        if (fetchNew) {
          setLastFreshFetchTime(Date.now()); 
        }

        if (user) { 
          const { error: upsertError } = await supabase
            .from('recipe_suggestions')
            .upsert({
              user_id: user.id,
              ingredients_key: currentIngredientsKey,
              recipes_markdown: recipesMarkdown,
              created_at: new Date().toISOString(), 
            }, { onConflict: 'user_id, ingredients_key' });
          if (upsertError) { console.error("Error upserting recipe suggestion:", upsertError); toast.error("Could not cache recipes."); }
          else { toast.success("New recipes fetched and cached!"); }
        }
      } else {  
            toast.info("AI couldn't come up with recipes this time. Try adjusting your items or try again.");
            // Only clear if no recipes were ever loaded or if this was a fresh fetch that failed to get new ones
            if (suggestedRecipesList.length === 0 || fetchNew) setSuggestedRecipesList([]);
        }
    } catch (error) {  
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error fetching recipes:", error);
        toast.error("Failed to fetch recipes.", { description: errorMessage });
        if (suggestedRecipesList.length === 0 || fetchNew) setSuggestedRecipesList([]);
    } finally {
      setIsFetchingRecipes(false); // Ensure this is always called
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Food Expiry Tracker</h1>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Column 1: Add Item Form & Items for Selected Date */}
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>Add New Item</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="itemName">Item Name</Label>
                        <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Milk, Eggs, Apple"/>
                    </div>
                    <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}/>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount (Optional)</Label>
                        <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 1 Gallon, 200g"/>
                    </div>
                    <Button onClick={handleAddItem} disabled={isLoading || !SPOONACULAR_API_KEY} className="w-full">
                        <PlusCircle className="h-5 w-5 mr-2" /> {isLoading ? 'Saving...' : 'Add to Fridge'}
                    </Button>
                    {!SPOONACULAR_API_KEY && <p className="text-xs text-red-500 mt-1">Image fetching disabled.</p>}
                </CardContent>
            </Card>

            {/* Expired Items Section */}
            {expiredItems.length > 0 && (
              <Card className="border-red-500 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700">Expired Items ({expiredItems.length})</CardTitle>
                  <CardDescription className="text-red-600">These items have passed their expiry date. Please check and dispose of them properly.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]"> {/* Max height for scroll */}
                    <ul className="space-y-2">
                      {expiredItems.map(item => {
                        const expiry = new Date(item.expiry_date + 'T00:00:00');
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const daysPast = Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <li key={item.id} className="text-sm flex items-center justify-between p-2 border-b border-red-200 last:border-b-0 bg-white rounded">
                            <div className="flex items-center flex-1">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-8 w-8 mr-2 rounded object-cover" />
                              ) : (
                                <ImageOff className="h-8 w-8 mr-2 text-red-400" />
                              )}
                              <div>
                                <span className="font-medium text-red-700">{item.name}</span>
                                {item.amount && <span className="text-xs text-red-500 ml-1">({item.amount})</span>}
                                <p className="text-xs text-red-500">
                                  Expired {daysPast === 0 ? 'today' : `${daysPast} day${daysPast > 1 ? 's' : ''} ago`} (on {expiry.toLocaleDateString()})
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => getDisposalGuidance(item)}
                                disabled={isFetchingDisposal || !OPENROUTER_API_KEY}
                                title="Get disposal guidance"
                              >
                                <Trash className="h-3 w-3 mr-1" />
                                Guide
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => handleDeleteItem(item.id, item.name)} 
                                disabled={isLoading}
                                title="Delete from list"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Display items for selected calendar date */}
            <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCalendarDate ? (() => {
                      const selectedDate = new Date(selectedCalendarDate.toISOString().split('T')[0] + 'T00:00:00');
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const diffTime = selectedDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays === 0) {
                        return `Expiring Today! (${selectedDate.toLocaleDateString()})`;
                      } else if (diffDays === 1) {
                        return `Expiring Tomorrow (${selectedDate.toLocaleDateString()})`;
                      } else if (diffDays > 1) {
                        return `Expiring in ${diffDays} days (${selectedDate.toLocaleDateString()})`;
                      } else {
                        // Past date
                        const daysPast = Math.abs(diffDays);
                        return `Expired ${daysPast === 1 ? '1 day' : `${daysPast} days`} ago (${selectedDate.toLocaleDateString()})`;
                      }
                    })() : '...'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && itemsOnSelectedDate.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
                    {!isLoading && itemsOnSelectedDate.length === 0 && <p className="text-sm text-gray-500">No items expiring on this date.</p>}
                    {itemsOnSelectedDate.length > 0 && (
                        <ul className="space-y-1">
                            {itemsOnSelectedDate.map(item => (
                                <li key={item.id} className="text-sm flex items-center">
                                    {item.image_url ? <img src={item.image_url} alt={item.name} className="h-6 w-6 mr-2 rounded object-cover" /> : <ImageOff className="h-6 w-6 mr-2 text-gray-300" />}
                                    {item.name} {item.amount && `(${item.amount})`}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Column 2: Fridge Contents & Calendar */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle>Your Fridge Contents</CardTitle></CardHeader>
                <CardContent>
                    {isLoading && fridgeItems.length === 0 && <p className="text-sm text-gray-500">Loading your fridge...</p>}
                    {!isLoading && fridgeItems.length === 0 && <p className="text-sm text-gray-500">Your fridge is empty. Add some items!</p>}
                    {fridgeItems.length > 0 && (
                        <ScrollArea className="h-[250px] sm:h-[300px]"> {/* Constrained height for scroll */}
                            <ul className="space-y-2 pr-3">
                                {fridgeItems.map(item => (
                                    <li key={item.id} className="p-2 border rounded-md flex justify-between items-center hover:bg-gray-50 text-sm">
                                        <div className="flex items-center flex-1">
                                            {item.image_url ? <img src={item.image_url} alt={item.name} className="h-10 w-10 mr-2 rounded object-cover"/> : <div className="h-10 w-10 mr-2 rounded bg-gray-100 flex items-center justify-center"><ImageOff className="h-5 w-5 text-gray-400" /></div>}
                                            <div className="flex-1">
                                                <p className="font-medium">{item.name}</p>
                                                {editingItemId === item.id ? (
                                                  <div className="space-y-2 mt-1">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="flex flex-col">
                                                        <label className="text-xs text-gray-500 mb-1">Expiry Date</label>
                                                        <Input
                                                          type="date"
                                                          value={editExpiryDate}
                                                          onChange={(e) => setEditExpiryDate(e.target.value)}
                                                          className="h-7 text-xs"
                                                          style={{ width: '140px' }}
                                                        />
                                                      </div>
                                                      <div className="flex flex-col">
                                                        <label className="text-xs text-gray-500 mb-1">Amount</label>
                                                        <Input
                                                          type="text"
                                                          value={editAmount}
                                                          onChange={(e) => setEditAmount(e.target.value)}
                                                          placeholder="e.g., 1 Gallon, 200g"
                                                          className="h-7 text-xs"
                                                          style={{ width: '120px' }}
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                      <Button 
                                                        size="sm" 
                                                        className="h-6 px-2 text-xs"
                                                        onClick={() => handleSaveExpiryDate(item.id, item.name)}
                                                        disabled={isLoading || !editExpiryDate}
                                                      >
                                                        Save
                                                      </Button>
                                                      <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 px-2 text-xs"
                                                        onClick={handleCancelEdit}
                                                        disabled={isLoading}
                                                      >
                                                        Cancel
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <p className="text-xs text-gray-500">Expires: {new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}</p>
                                                    {item.amount && <p className="text-xs text-gray-500">Amount: {item.amount}</p>}
                                                  </>
                                                )}
                                            </div>
                                        </div>
                                        {editingItemId !== item.id && (
                                          <div className="flex items-center space-x-2">
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7" 
                                                onClick={() => handleEditExpiryDate(item)} 
                                                disabled={isLoading}
                                                title="Edit item details"
                                              >
                                                <Edit3 className="h-4 w-4 text-gray-500" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7" 
                                                onClick={() => handleDeleteItem(item.id, item.name)} 
                                                disabled={isLoading}
                                                title="Delete item"
                                              >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                              </Button>
                                          </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Expiry Calendar</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar mode="single" selected={selectedCalendarDate} onSelect={handleDateSelect} className="rounded-md border" modifiers={expiryDateModifiers} modifiersStyles={expiryDateModifierStyles} disabled={isLoading}/>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Section for Recipe Suggestions */}
      <div className="mt-10 pt-6 border-t">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Meal Ideas & Recipes</h2>
            <Button 
              onClick={() => handleSuggestRecipes(true)} 
              disabled={
                isFetchingRecipes || 
                !OPENROUTER_API_KEY || 
                fridgeItems.filter(item => new Date(item.expiry_date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0))).length === 0 ||
                (lastFreshFetchTime && (Date.now() - lastFreshFetchTime < FRESH_FETCH_COOLDOWN_MS))
              }
              variant="outline"
              size="sm"
              title={
                (lastFreshFetchTime && (Date.now() - lastFreshFetchTime < FRESH_FETCH_COOLDOWN_MS)) 
                ? `Please wait ${Math.ceil((FRESH_FETCH_COOLDOWN_MS - (Date.now() - lastFreshFetchTime)) / 1000)}s`
                : "Get fresh recipe ideas from AI (bypasses cache)"
              }
            >
                <Lightbulb className="h-4 w-4 mr-2" />
                {isFetchingRecipes ? "Fetching Recipes..." : "Get Fresh Recipe Ideas"}
            </Button>
        </div>

        {/* Placeholder/Status Messages Section */}
        {suggestedRecipesList.length === 0 && !isFetchingRecipes && initialCacheLoadAttempted && !isLoading && (
            <>
                {OPENROUTER_API_KEY && fridgeItems.filter(item => new Date(item.expiry_date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0))).length > 0 && (
                    <Card className="bg-gray-50 my-4">
                        <CardContent className="pt-6 text-sm text-center text-gray-600">
                            <ChefHat className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                            No recipes suggested yet for the current items. <br/>Consider clicking "Get Fresh Recipe Ideas" to generate some!
                        </CardContent>
                    </Card>
                )}
                {OPENROUTER_API_KEY && fridgeItems.length === 0 && (
                    <Card className="bg-gray-50 my-4">
                        <CardContent className="pt-6 text-sm text-center text-gray-600">
                            <ChefHat className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            Your fridge is empty. Add some items to get recipe ideas!
                        </CardContent>
                    </Card>
                )}
            </>
        )}

        {(!OPENROUTER_API_KEY || (fridgeItems.length > 0 && fridgeItems.filter(item => new Date(item.expiry_date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0))).length === 0 && !isLoading)) && (
            <Card className="bg-yellow-50 border-yellow-200 my-4">
                <CardContent className="pt-6 text-sm text-yellow-700">
                    {!OPENROUTER_API_KEY && <p>Recipe suggestions disabled: OpenRouter API key missing in settings.</p>}
                    {OPENROUTER_API_KEY && fridgeItems.length > 0 && fridgeItems.filter(item => new Date(item.expiry_date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0))).length === 0 && !isLoading &&
                        <p>You have items in your fridge, but all are expired. Add some non-expired items to get recipe suggestions.</p>
                    }
                </CardContent>
            </Card>
        )}
        
        {suggestedRecipesList.length > 0 && (
          <div className="space-y-4 mt-4">
            {suggestedRecipesList.map((recipe) => (
              <Card key={recipe.id} className={`transition-all duration-300 ${recipe.source === 'api' ? 'border-blue-500 shadow-blue-100' : 'border-gray-200'}`}>
                <CardHeader className="cursor-pointer" onClick={() => toggleRecipeExpansion(recipe.id)}>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    {expandedRecipeId === recipe.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                  {recipe.cachedAt && <p className="text-xs text-gray-500 pt-1">Cached: {recipe.cachedAt}</p>}
                   {!recipe.cachedAt && recipe.source ==='api' && <p className="text-xs text-blue-600 pt-1">Newly Fetched!</p>}
                  <CardDescription className="pt-1 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: React.Fragment }}>
                        {recipe.description}
                    </ReactMarkdown>
                  </CardDescription>
                </CardHeader>
                {expandedRecipeId === recipe.id && (
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <h4 className="font-semibold mt-2 mb-1">Ingredients:</h4>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{recipe.ingredients}</ReactMarkdown>
                      <h4 className="font-semibold mt-3 mb-1">Instructions:</h4>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{recipe.instructions}</ReactMarkdown>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Disposal Guidance Modal */}
      <Dialog open={isDisposalModalOpen} onOpenChange={setIsDisposalModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trash className="h-5 w-5 mr-2 text-red-500" />
              Disposal Guide: {selectedDisposalItem?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDisposalItem && (
                <span className="text-sm text-gray-600">
                  {selectedDisposalItem.amount && `Amount: ${selectedDisposalItem.amount} • `}
                  Expired: {(() => {
                    const expiry = new Date(selectedDisposalItem.expiry_date + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysPast = Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
                    return `${daysPast} day${daysPast !== 1 ? 's' : ''} ago`;
                  })()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {isFetchingDisposal ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                <span className="ml-3 text-gray-600">Generating disposal guidance...</span>
              </div>
            ) : disposalGuidance ? (
              <div className="prose prose-sm max-w-none py-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {disposalGuidance}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No disposal guidance available.
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDisposalModalOpen(false)}
            >
              Close
            </Button>
            {selectedDisposalItem && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteItem(selectedDisposalItem.id, selectedDisposalItem.name);
                  setIsDisposalModalOpen(false);
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Mark as Disposed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FoodExpiryPage; 