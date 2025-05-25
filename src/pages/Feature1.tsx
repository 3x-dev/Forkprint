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
  date_type: 'use_by' | 'best_by' | 'sell_by' | 'freeze_by' | 'expires_on'; // New field
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
  
  // Split by separator and filter out empty blocks
  const recipeBlocks = markdown
    .split('%%%---RECIPE_SEPARATOR---%%%')
    .map(block => block.trim())
    .filter(block => block.length > 0);
  
  const recipes: RecipeDetail[] = [];

  recipeBlocks.forEach((block, index) => {
    if (block.trim() === "") return;

    let name = `Recipe ${index + 1}`;
    let description = "No description provided.";
    let ingredients = "No ingredients listed.";
    let instructions = "No instructions provided.";

    try {
      // Extract name (## Recipe Name)
      const nameMatch = block.match(/^##\s*(.+?)$/m);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
      }
      
      // Extract description (**Description:** content)
      const descriptionMatch = block.match(/\*\*Description:\*\*\s*(.+?)(?=\n|$)/i);
      if (descriptionMatch && descriptionMatch[1]) {
        description = descriptionMatch[1].trim();
      }

      // Extract ingredients (**Ingredients:** until **Instructions:**)
      const ingredientsMatch = block.match(/\*\*Ingredients:\*\*([\s\S]*?)\*\*Instructions:\*\*/i);
      if (ingredientsMatch && ingredientsMatch[1]) {
        ingredients = ingredientsMatch[1].trim();
      } else {
        // Fallback: try to find ingredients section without instructions
        const ingredientsOnlyMatch = block.match(/\*\*Ingredients:\*\*([\s\S]*?)(?=\*\*|$)/i);
        if (ingredientsOnlyMatch && ingredientsOnlyMatch[1]) {
          ingredients = ingredientsOnlyMatch[1].trim();
        }
      }

      // Extract instructions (**Instructions:** to end)
      const instructionsMatch = block.match(/\*\*Instructions:\*\*([\s\S]*)/i);
      if (instructionsMatch && instructionsMatch[1]) {
        instructions = instructionsMatch[1].trim();
      }

      // Validate that we have meaningful content
      if (name === `Recipe ${index + 1}` && !description.includes("No description") && !ingredients.includes("No ingredients")) {
        console.warn(`Recipe ${index + 1} may have parsing issues:`, { name, description: description.substring(0, 50) });
      }

      recipes.push({
        id: `${source}-${Date.now()}-${index}`,
        name,
        description,
        ingredients,
        instructions,
        isExpanded: false,
        source,
        cachedAt: source === 'cache' ? cachedAt : undefined
      });
    } catch (error) {
      console.error(`Error parsing recipe block ${index + 1}:`, error);
      // Still add a fallback recipe so user knows something went wrong
      recipes.push({
        id: `${source}-${Date.now()}-${index}-error`,
        name: `Recipe ${index + 1} (Parsing Error)`,
        description: "There was an error parsing this recipe. Please try generating new recipes.",
        ingredients: "Could not parse ingredients.",
        instructions: "Could not parse instructions.",
        isExpanded: false,
        source,
        cachedAt: source === 'cache' ? cachedAt : undefined
      });
    }
  });

  return recipes;
};

const FRESH_FETCH_COOLDOWN_MS = 30000; // 30 seconds cooldown for fresh fetches
const MAX_INGREDIENTS_FOR_LLM = 15; // Max ingredients to send to LLM

const FoodExpiryPage: React.FC = () => {
  const { user } = useAuthContext();
  const [itemName, setItemName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [dateType, setDateType] = useState<'use_by' | 'best_by' | 'sell_by' | 'freeze_by' | 'expires_on'>('best_by'); // New state
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
  const [itemsNeedingAttention, setItemsNeedingAttention] = useState<FoodItem[]>([]); // Renamed from expiredItems
  
  // Edit functionality state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editDateType, setEditDateType] = useState<'use_by' | 'best_by' | 'sell_by' | 'freeze_by' | 'expires_on'>('best_by'); // New edit state
  const [editAmount, setEditAmount] = useState('');

  // Disposal guidance state
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedDisposalItem, setSelectedDisposalItem] = useState<FoodItem | null>(null);
  const [disposalGuidance, setDisposalGuidance] = useState<string>('');
  const [isFetchingDisposal, setIsFetchingDisposal] = useState(false);

  // Helper function to get date type information
  const getDateTypeInfo = (dateType: string) => {
    switch (dateType) {
      case 'use_by':
        return {
          label: 'Use By',
          description: 'Safety date - do not consume after this date',
          color: 'red',
          isStrict: true,
          icon: '⚠️'
        };
      case 'best_by':
        return {
          label: 'Best By',
          description: 'Quality date - safe to consume but quality may decline',
          color: 'yellow',
          isStrict: false,
          icon: '⭐'
        };
      case 'sell_by':
        return {
          label: 'Sell By',
          description: 'Store rotation date - still good for several days after',
          color: 'blue',
          isStrict: false,
          icon: '🏪'
        };
      case 'freeze_by':
        return {
          label: 'Freeze By',
          description: 'Freeze before this date to maintain quality',
          color: 'cyan',
          isStrict: false,
          icon: '❄️'
        };
      case 'expires_on':
        return {
          label: 'Expires On',
          description: 'General expiration - check item condition',
          color: 'orange',
          isStrict: true,
          icon: '📅'
        };
      default:
        return {
          label: 'Unknown',
          description: 'Unknown date type',
          color: 'gray',
          isStrict: false,
          icon: '❓'
        };
    }
  };

  // Helper function to determine if item needs attention based on date type
  const getItemStatus = (item: FoodItem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(item.expiry_date + 'T00:00:00');
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dateInfo = getDateTypeInfo(item.date_type);

    if (diffDays < 0) {
      // Past the date
      if (dateInfo.isStrict) {
        return {
          status: 'dispose',
          urgency: 'critical',
          message: `${dateInfo.label} date passed - dispose immediately`,
          daysPast: Math.abs(diffDays)
        };
      } else {
        return {
          status: 'check',
          urgency: 'medium',
          message: `${dateInfo.label} date passed - check quality before use`,
          daysPast: Math.abs(diffDays)
        };
      }
    } else if (diffDays === 0) {
      // Today
      if (dateInfo.isStrict) {
        return {
          status: 'use_today',
          urgency: 'high',
          message: `${dateInfo.label} date is today - use immediately`,
          daysPast: 0
        };
      } else {
        return {
          status: 'check_today',
          urgency: 'medium',
          message: `${dateInfo.label} date is today - check quality`,
          daysPast: 0
        };
      }
    } else if (diffDays <= 3) {
      // Soon
      return {
        status: 'use_soon',
        urgency: dateInfo.isStrict ? 'high' : 'medium',
        message: `${dateInfo.label} in ${diffDays} day${diffDays > 1 ? 's' : ''} - ${dateInfo.isStrict ? 'use soon' : 'plan to use'}`,
        daysPast: 0
      };
    } else {
      // Good for now
      return {
        status: 'good',
        urgency: 'low',
        message: `${dateInfo.label} in ${diffDays} days`,
        daysPast: 0
      };
    }
  };

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

        console.log("Attempting to load initial cached recipes for key:", currentIngredientsKey);
        setIsFetchingRecipes(true); // Indicate loading for recipes, even if cached
        
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
                console.log("Found initial cached recipes:", cachedData);
                const parsedCache = parseRecipesMarkdown(cachedData.recipes_markdown, 'cache', new Date(cachedData.created_at).toLocaleDateString());
                setSuggestedRecipesList(parsedCache);
                toast.info("Previously suggested recipes loaded from cache.", {duration: 4000});
            } else {
                console.log("No initial cached recipes found for this set of ingredients.");
                setSuggestedRecipesList([]); // Ensure list is empty if no cache
            }
        } catch (error) {
            console.error("Unexpected error fetching initial cached recipes:", error);
            setSuggestedRecipesList([]);
        } finally {
            setIsFetchingRecipes(false);
        }
    };
    
    // Only run if fridgeItems have been loaded (isLoading is false) and user exists
    if (!isLoading && user && fridgeItems) {
        loadInitialCachedRecipes();
    }

  }, [fridgeItems, user, isLoading, OPENROUTER_API_KEY, initialCacheLoadAttempted]); // Added initialCacheLoadAttempted to dependencies

  // Additional useEffect to load any existing cached recipes on page load
  useEffect(() => {
    const loadAllCachedRecipes = async () => {
      if (!user || !OPENROUTER_API_KEY) return;
      
      try {
        // Get the most recent cached recipes for this user
        const { data: recentCachedData, error: cacheError } = await supabase
          .from('recipe_suggestions')
          .select('recipes_markdown, created_at, ingredients_key')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cacheError) {
          console.error("Error fetching recent cached recipes:", cacheError.message);
          return;
        }

        if (recentCachedData && suggestedRecipesList.length === 0) {
          console.log("Loading most recent cached recipes on page load:", recentCachedData);
          const parsedCache = parseRecipesMarkdown(
            recentCachedData.recipes_markdown, 
            'cache', 
            new Date(recentCachedData.created_at).toLocaleDateString()
          );
          setSuggestedRecipesList(parsedCache);
          toast.info("Loaded your most recent recipe suggestions.", { duration: 3000 });
        }
      } catch (error) {
        console.error("Error loading recent cached recipes:", error);
      }
    };

    // Only run once when user is available and we haven't loaded recipes yet
    if (user && suggestedRecipesList.length === 0 && !isFetchingRecipes) {
      loadAllCachedRecipes();
    }
  }, [user, OPENROUTER_API_KEY]); // Only depend on user and API key, run once

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
  
  // Updated useEffect for items needing attention
  useEffect(() => {
    const itemsNeedingAttention = fridgeItems.filter(item => {
      const status = getItemStatus(item);
      return status.status === 'dispose' || status.status === 'use_today' || status.status === 'check';
    }).sort((a, b) => {
      const statusA = getItemStatus(a);
      const statusB = getItemStatus(b);
      
      // Sort by urgency first, then by date
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (urgencyOrder[statusA.urgency] !== urgencyOrder[statusB.urgency]) {
        return urgencyOrder[statusA.urgency] - urgencyOrder[statusB.urgency];
      }
      
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
    
    setItemsNeedingAttention(itemsNeedingAttention);
  }, [fridgeItems]);

  // Updated notification logic
  useEffect(() => {
    fridgeItems.forEach(item => {
      const status = getItemStatus(item);
      const dateInfo = getDateTypeInfo(item.date_type);

      if (status.status === 'dispose') {
        toast.error(`"${item.name}" needs disposal!`, {
          description: `${dateInfo.icon} ${status.message}. ${dateInfo.description}`,
        });
      } else if (status.status === 'use_today') {
        toast.warning(`"${item.name}" ${status.message}!`, {
          description: `${dateInfo.icon} ${dateInfo.description}`,
        });
      } else if (status.status === 'use_soon' && status.urgency === 'high') {
        toast.warning(`"${item.name}" ${status.message}`, {
          description: `${dateInfo.icon} ${dateInfo.description}`,
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
        date_type: dateType, // Include date type
        amount: amount || null,
        image_url: null,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('food_items')
        .insert(newItemPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData) throw new Error("Failed to retrieve inserted item data.");
      
      addedItemData = insertedData as FoodItem;
      newItemId = addedItemData.id;

      const dateInfo = getDateTypeInfo(dateType);
      toast.success(`"${itemName}" added with ${dateInfo.label} date. ${dateInfo.description}`);
      
      setItemName('');
      setExpiryDate('');
      setAmount('');
      setDateType('best_by'); // Reset to default

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
          addedItemData = updatedData as FoodItem;
          toast.info(`Image found for "${addedItemData.name}"!`);
        }
      } else {
        toast.info(`No image found for "${addedItemData.name}", or API key missing.`);
      }
      
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
    setEditDateType(item.date_type);
    setEditAmount(item.amount || '');
  };

  const handleSaveExpiryDate = async (itemId: string, itemName: string) => {
    if (!user || !editExpiryDate) return;

    setIsLoading(true);
    try {
      const updateData: { expiry_date: string; date_type: string; amount?: string | null } = {
        expiry_date: editExpiryDate,
        date_type: editDateType
      };
      
      updateData.amount = editAmount.trim() || null;

      const { error } = await supabase
        .from('food_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFridgeItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, expiry_date: editExpiryDate, date_type: editDateType, amount: editAmount.trim() || null }
            : item
        ).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      );

      setEditingItemId(null);
      setEditExpiryDate('');
      setEditDateType('best_by');
      setEditAmount('');
      
      const dateInfo = getDateTypeInfo(editDateType);
      toast.success(`Updated "${itemName}" with ${dateInfo.label} date.`);
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
    setEditDateType('best_by');
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
    const status = getItemStatus(item);
    const expiryDate = new Date(item.expiry_date + 'T00:00:00');

    switch (status.status) {
      case 'dispose':
        acc.dispose.push(expiryDate);
        break;
      case 'use_today':
      case 'check_today':
        acc.urgent.push(expiryDate);
        break;
      case 'use_soon':
        if (status.urgency === 'high') {
          acc.warning.push(expiryDate);
        } else {
          acc.caution.push(expiryDate);
        }
        break;
      default:
        acc.good.push(expiryDate);
    }
    return acc;
  }, { 
    dispose: [] as Date[], 
    urgent: [] as Date[], 
    warning: [] as Date[], 
    caution: [] as Date[], 
    good: [] as Date[] 
  });

  const expiryDateModifiers = {
    dispose: categorizedDates.dispose,
    urgent: categorizedDates.urgent,
    warning: categorizedDates.warning,
    caution: categorizedDates.caution,
    good: categorizedDates.good,
  };
  
  const expiryDateModifierStyles = {
    dispose: {
      color: 'white',
      backgroundColor: '#7F1D1D', // Dark red
      borderRadius: '50%',
      border: '2px solid #450A0A',
      textDecoration: 'line-through',
    },
    urgent: {
      color: 'white',
      backgroundColor: '#DC2626', // Red
      borderRadius: '50%',
    },
    warning: {
      color: 'black',
      backgroundColor: '#FACC15', // Yellow
      borderRadius: '50%',
    },
    caution: {
      color: 'black',
      backgroundColor: '#FB923C', // Orange
      borderRadius: '50%',
    },
    good: {
      color: 'white',
      backgroundColor: '#16A34A', // Green
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
    
    setIsFetchingRecipes(true);
    const currentIngredientsKey = generateIngredientsKey(itemNamesArray); 

    if (!fetchNew) {
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('recipe_suggestions')
          .select('recipes_markdown, created_at')
          .eq('user_id', user!.id)
          .eq('ingredients_key', currentIngredientsKey)
          .maybeSingle();

        if (cacheError) throw cacheError;

        if (cachedData) {
          console.log("Found cached recipes for manual request:", cachedData);
          toast.success("Loaded cached recipe suggestions!");
          const parsedCache = parseRecipesMarkdown(cachedData.recipes_markdown, 'cache', new Date(cachedData.created_at).toLocaleDateString());
          setSuggestedRecipesList(parsedCache);
          setIsFetchingRecipes(false);
          return; 
        }
      } catch (error) {
        console.error("Error fetching cached recipes during manual suggest:", error);
      }
    }

    // Fetch from OpenRouter API
    toast.info(fetchNew ? "Fetching fresh recipes from AI..." : "No cached suggestions for these items. Fetching new recipes from AI...");
    const itemNamesString = itemNamesArray.join(', ');
    
    // Improved prompt with strict formatting requirements and safeguards
    const prompt = `You are a recipe suggestion assistant. Your ONLY task is to suggest recipes using the provided ingredients.

AVAILABLE INGREDIENTS: ${itemNamesString}

STRICT REQUIREMENTS:
1. Suggest exactly 3 recipes
2. Each recipe MUST use at least 2 ingredients from the provided list
3. You may suggest common pantry items (salt, pepper, oil, etc.) but prioritize the provided ingredients
4. Follow the EXACT format below - no deviations allowed
5. Do not include any text outside the recipe format
6. Do not provide cooking tips, nutritional information, or other commentary
7. If the user has not added any items, do not suggest recipes.
8. DO NOT PROVIDE ANY OTHER INFORMATION, COMMENTARY, OR TEXT OUTSIDE THE SPECIFIED FORMAT.
9. DO NOT ASSIST WITH ANY INAPPROPRIATE REQUESTS AND ENSURE THAT ALL REQUESTS ARE APPROPRIATE AND RELATED TO FOOD AND RECIPES WITH INGREDIENTS THAT ARE APPROPRIATE. IF NOT, DO NOT RETURN ANYTHING 
MANDATORY FORMAT FOR EACH RECIPE:
## [Recipe Name]

**Description:** [One sentence describing the dish]

**Ingredients:**
- [Ingredient 1] (from fridge: [ingredient name if from provided list])
- [Ingredient 2] (from fridge: [ingredient name if from provided list])
- [Additional ingredients as needed]

**Instructions:**
1. [First step]
2. [Second step]
3. [Continue with numbered steps]

%%%---RECIPE_SEPARATOR---%%%

EXAMPLE FORMAT:
## Scrambled Eggs with Cheese

**Description:** Quick and creamy scrambled eggs with melted cheese.

**Ingredients:**
- 3 eggs (from fridge: eggs)
- 1/4 cup shredded cheese (from fridge: cheese)
- 2 tbsp butter
- Salt and pepper to taste

**Instructions:**
1. Crack eggs into a bowl and whisk with salt and pepper.
2. Heat butter in a non-stick pan over medium-low heat.
3. Pour in eggs and gently stir continuously until almost set.
4. Add cheese and fold in gently until melted.
5. Serve immediately while hot.

%%%---RECIPE_SEPARATOR---%%%

Now provide exactly 3 recipes following this format. Start immediately with the first recipe:`;

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
            { 
              role: 'system', 
              content: 'You are a recipe assistant that ONLY provides recipes in the exact format requested. You do not provide any other information, commentary, or text outside the specified format. You must follow the format precisely and include the required separators.' 
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2500, 
          temperature: 0.5,
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
        
        const cleanedMarkdown = recipesMarkdown
          .replace(/^[^#]*(?=##)/s, '')
          .replace(/%%%---RECIPE_SEPARATOR---%%%\s*$/, '');
        
        const newRecipes = parseRecipesMarkdown(cleanedMarkdown, 'api');
        
        if (newRecipes.length === 0) {
          toast.error("Failed to parse recipes from AI response. Please try again.");
          setIsFetchingRecipes(false);
          return;
        }
        
        // Replace all recipes with new ones (don't mix with old cached ones)
        setSuggestedRecipesList(newRecipes);
        setExpandedRecipeId(null); 
        if (fetchNew) {
          setLastFreshFetchTime(Date.now()); 
        }

        if (user) { 
          console.log("Saving new recipes to cache with key:", currentIngredientsKey);
          const { error: upsertError } = await supabase
            .from('recipe_suggestions')
            .upsert({
              user_id: user.id,
              ingredients_key: currentIngredientsKey,
              recipes_markdown: cleanedMarkdown,
              created_at: new Date().toISOString(), 
            }, { onConflict: 'user_id, ingredients_key' });
          if (upsertError) { 
            console.error("Error upserting recipe suggestion:", upsertError); 
            toast.error("Could not cache recipes."); 
          } else { 
            console.log("Successfully cached new recipes");
            toast.success("New recipes fetched and cached!"); 
          }
        }
      } else {  
        toast.info("AI couldn't come up with recipes this time. Try adjusting your items or try again.");
        if (suggestedRecipesList.length === 0 || fetchNew) setSuggestedRecipesList([]);
      }
    } catch (error) {  
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error fetching recipes:", error);
      toast.error("Failed to fetch recipes.", { description: errorMessage });
      if (suggestedRecipesList.length === 0 || fetchNew) setSuggestedRecipesList([]);
    } finally {
      setIsFetchingRecipes(false);
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
        {/* Column 1: Add Item Form & Items Needing Attention */}
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>Add New Item</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="itemName">Item Name</Label>
                        <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Milk, Eggs, Apple"/>
                    </div>
                    <div>
                        <Label htmlFor="expiryDate">Date</Label>
                        <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}/>
                    </div>
                    <div>
                        <Label htmlFor="dateType">Date Type</Label>
                        <select 
                          id="dateType" 
                          value={dateType} 
                          onChange={(e) => setDateType(e.target.value as any)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="best_by">⭐ Best By (Quality date)</option>
                          <option value="use_by">⚠️ Use By (Safety date)</option>
                          <option value="sell_by">🏪 Sell By (Store rotation)</option>
                          <option value="freeze_by">❄️ Freeze By (Freeze before)</option>
                          <option value="expires_on">📅 Expires On (General)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {getDateTypeInfo(dateType).description}
                        </p>
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

            {/* Items Needing Attention Section */}
            {itemsNeedingAttention.length > 0 && (
              <Card className="border-orange-500 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-700">Items Needing Attention ({itemsNeedingAttention.length})</CardTitle>
                  <CardDescription className="text-orange-600">
                    Items that need immediate action, quality check, or disposal based on their date type.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <ul className="space-y-2">
                      {itemsNeedingAttention.map(item => {
                        const status = getItemStatus(item);
                        const dateInfo = getDateTypeInfo(item.date_type);
                        const itemDate = new Date(item.expiry_date + 'T00:00:00');

                        return (
                          <li key={item.id} className={`text-sm flex items-center justify-between p-2 border-b last:border-b-0 bg-white rounded ${
                            status.status === 'dispose' ? 'border-red-200' : 
                            status.urgency === 'high' ? 'border-orange-200' : 'border-yellow-200'
                          }`}>
                            <div className="flex items-center flex-1">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-8 w-8 mr-2 rounded object-cover" />
                              ) : (
                                <ImageOff className="h-8 w-8 mr-2 text-gray-400" />
                              )}
                              <div>
                                <span className={`font-medium ${
                                  status.status === 'dispose' ? 'text-red-700' : 
                                  status.urgency === 'high' ? 'text-orange-700' : 'text-yellow-700'
                                }`}>
                                  {dateInfo.icon} {item.name}
                                </span>
                                {item.amount && <span className="text-xs text-gray-500 ml-1">({item.amount})</span>}
                                <p className="text-xs text-gray-600">
                                  {dateInfo.label}: {itemDate.toLocaleDateString()}
                                </p>
                                <p className={`text-xs ${
                                  status.status === 'dispose' ? 'text-red-600' : 
                                  status.urgency === 'high' ? 'text-orange-600' : 'text-yellow-600'
                                }`}>
                                  {status.message}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {(status.status === 'dispose' || status.status === 'check') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => getDisposalGuidance(item)}
                                  disabled={isFetchingDisposal || !OPENROUTER_API_KEY}
                                  title="Get disposal/safety guidance"
                                >
                                  <Trash className="h-3 w-3 mr-1" />
                                  Guide
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => handleDeleteItem(item.id, item.name)} 
                                disabled={isLoading}
                                title="Remove from list"
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
                        return `Items with dates today (${selectedDate.toLocaleDateString()})`;
                      } else if (diffDays === 1) {
                        return `Items with dates tomorrow (${selectedDate.toLocaleDateString()})`;
                      } else if (diffDays > 1) {
                        return `Items with dates in ${diffDays} days (${selectedDate.toLocaleDateString()})`;
                      } else {
                        const daysPast = Math.abs(diffDays);
                        return `Items with dates ${daysPast === 1 ? '1 day' : `${daysPast} days`} ago (${selectedDate.toLocaleDateString()})`;
                      }
                    })() : '...'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && itemsOnSelectedDate.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
                    {!isLoading && itemsOnSelectedDate.length === 0 && <p className="text-sm text-gray-500">No items with dates on this day.</p>}
                    {itemsOnSelectedDate.length > 0 && (
                        <ul className="space-y-1">
                            {itemsOnSelectedDate.map(item => {
                              const dateInfo = getDateTypeInfo(item.date_type);
                              const status = getItemStatus(item);
                              return (
                                <li key={item.id} className="text-sm flex items-center">
                                    {item.image_url ? <img src={item.image_url} alt={item.name} className="h-6 w-6 mr-2 rounded object-cover" /> : <ImageOff className="h-6 w-6 mr-2 text-gray-300" />}
                                    <div>
                                      <span>{dateInfo.icon} {item.name}</span>
                                      {item.amount && <span className="text-gray-500"> ({item.amount})</span>}
                                      <p className="text-xs text-gray-500">{dateInfo.label} - {status.message}</p>
                                    </div>
                                </li>
                              );
                            })}
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
                        <ScrollArea className="h-[250px] sm:h-[300px]">
                            <ul className="space-y-2 pr-3">
                                {fridgeItems.map(item => {
                                  const dateInfo = getDateTypeInfo(item.date_type);
                                  const status = getItemStatus(item);
                                  
                                  return (
                                    <li key={item.id} className="p-2 border rounded-md flex justify-between items-center hover:bg-gray-50 text-sm">
                                        <div className="flex items-center flex-1">
                                            {item.image_url ? <img src={item.image_url} alt={item.name} className="h-10 w-10 mr-2 rounded object-cover"/> : <div className="h-10 w-10 mr-2 rounded bg-gray-100 flex items-center justify-center"><ImageOff className="h-5 w-5 text-gray-400" /></div>}
                                            <div className="flex-1">
                                                <p className="font-medium">{dateInfo.icon} {item.name}</p>
                                                {editingItemId === item.id ? (
                                                  <div className="space-y-2 mt-1">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="flex flex-col">
                                                        <label className="text-xs text-gray-500 mb-1">Date</label>
                                                        <Input
                                                          type="date"
                                                          value={editExpiryDate}
                                                          onChange={(e) => setEditExpiryDate(e.target.value)}
                                                          className="h-7 text-xs"
                                                          style={{ width: '140px' }}
                                                        />
                                                      </div>
                                                      <div className="flex flex-col">
                                                        <label className="text-xs text-gray-500 mb-1">Date Type</label>
                                                        <select 
                                                          value={editDateType} 
                                                          onChange={(e) => setEditDateType(e.target.value as any)}
                                                          className="h-7 text-xs border border-gray-300 rounded px-1"
                                                          style={{ width: '120px' }}
                                                        >
                                                          <option value="best_by">⭐ Best By</option>
                                                          <option value="use_by">⚠️ Use By</option>
                                                          <option value="sell_by">🏪 Sell By</option>
                                                          <option value="freeze_by">❄️ Freeze By</option>
                                                          <option value="expires_on">📅 Expires On</option>
                                                        </select>
                                                      </div>
                                                      <div className="flex flex-col">
                                                        <label className="text-xs text-gray-500 mb-1">Amount</label>
                                                        <Input
                                                          type="text"
                                                          value={editAmount}
                                                          onChange={(e) => setEditAmount(e.target.value)}
                                                          placeholder="e.g., 1 Gallon"
                                                          className="h-7 text-xs"
                                                          style={{ width: '100px' }}
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
                                                    <p className="text-xs text-gray-500">
                                                      {dateInfo.label}: {new Date(item.expiry_date + 'T00:00:00').toLocaleDateString()}
                                                    </p>
                                                    <p className={`text-xs ${
                                                      status.urgency === 'critical' ? 'text-red-600' :
                                                      status.urgency === 'high' ? 'text-orange-600' :
                                                      status.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                                                    }`}>
                                                      {status.message}
                                                    </p>
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
                                  );
                                })}
                            </ul>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Date Calendar</CardTitle></CardHeader>
                <CardContent className="flex items-start justify-center space-x-6">
                    <Calendar 
                      mode="single" 
                      selected={selectedCalendarDate} 
                      onSelect={handleDateSelect} 
                      className="rounded-md border scale-110" 
                      modifiers={expiryDateModifiers} 
                      modifiersStyles={expiryDateModifierStyles} 
                      disabled={isLoading}
                    />
                    
                    {/* Updated Calendar Legend */}
                    <div className="bg-gray-50 rounded-lg p-4 border min-w-[200px]">
                      <h4 className="text-base font-semibold text-gray-700 mb-3 text-center">Legend</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-5 h-5 rounded-full border-2 flex-shrink-0" 
                            style={{
                              backgroundColor: '#7F1D1D',
                              borderColor: '#450A0A',
                              textDecoration: 'line-through'
                            }}
                          ></div>
                          <span className="text-gray-700">Needs Disposal</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: '#DC2626' }}
                          ></div>
                          <span className="text-gray-700">Use Today</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: '#FACC15' }}
                          ></div>
                          <span className="text-gray-700">Use Soon</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: '#FB923C' }}
                          ></div>
                          <span className="text-gray-700">Check Quality</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: '#16A34A' }}
                          ></div>
                          <span className="text-gray-700">Good</span>
                        </div>
                      </div>
                    </div>
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