# Food Waste Logger Feature

## Overview
The Food Waste Logger feature allows users to track and analyze their food waste patterns. Users can log their meals, record what portion was wasted, and view visual trends over time to encourage better consumption habits.

## Key Features
- Log meals with multiple food items
- Record waste amounts for each food item (none, quarter, half, three quarters, all)
- Track reasons for waste and disposal methods
- View waste percentage trends over time via a line graph
- Receive encouraging messages based on waste reduction performance

## Technical Implementation
The feature uses:
- React with TypeScript for the frontend
- Supabase for database storage and authentication
- Recharts for data visualization
- Three database tables:
  - FoodServings: Tracks meals
  - ServedPortions: Tracks individual food items within meals
  - FoodWasteEntries: Tracks waste data for each portion

## Database Schema
```sql
-- FoodServings Table
CREATE TABLE public.food_servings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    served_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ServedPortions Table
CREATE TABLE public.served_portions (
    id UUID PRIMARY KEY,
    serving_id UUID REFERENCES public.food_servings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_food_item_name TEXT NOT NULL,
    quantity_served NUMERIC NOT NULL,
    unit_served TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FoodWasteEntries Table
CREATE TABLE public.food_waste_entries (
    id UUID PRIMARY KEY,
    served_portion_id UUID REFERENCES public.served_portions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quantity_wasted_as_fraction_of_served NUMERIC NOT NULL,
    user_waste_description TEXT,
    waste_reason TEXT,
    disposal_action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## How to Use
1. Navigate to the Food Waste Logger feature from the dashboard
2. Log a meal using the "Log a Meal" form
   - Add a meal name and optional notes
   - Add one or more food items with quantities and units
3. For previously logged meals, click "Log Waste" to record how much was wasted
4. View your waste trends in the chart section
5. Receive encouragement messages based on your waste reduction performance

## Future Enhancements
- Add image upload capability for meals
- Implement AI-based suggestions for reducing waste
- Allow users to set waste reduction goals
- Add social sharing features to encourage friends 