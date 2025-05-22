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
CREATE TABLE FoodServings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    meal_name TEXT NOT NULL,
    served_at TIMESTAMPTZ,
    notes TEXT
);

-- ServedPortions Table
CREATE TABLE ServedPortions (
    id UUID PRIMARY KEY,
    serving_id UUID REFERENCES FoodServings(id),
    user_id UUID NOT NULL,
    custom_food_item_name TEXT NOT NULL,
    quantity_served NUMERIC NOT NULL,
    unit_served TEXT NOT NULL,
    description TEXT
);

-- FoodWasteEntries Table
CREATE TABLE FoodWasteEntries (
    id UUID PRIMARY KEY,
    served_portion_id UUID REFERENCES ServedPortions(id),
    user_id UUID NOT NULL,
    quantity_wasted_as_fraction_of_served NUMERIC NOT NULL,
    user_waste_description TEXT,
    waste_reason TEXT,
    disposal_action_taken TEXT
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