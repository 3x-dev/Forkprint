export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      res.status(400).json({ error: 'Invalid ingredients provided' });
      return;
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'Anthropic API key not configured on server' });
      return;
    }
    
    const prompt = `You are a recipe suggestion assistant. Your ONLY task is to suggest recipes using the provided ingredients.

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

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

    console.log('Making request to Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2500,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status} ${errorText}`);
      res.status(response.status).json({ 
        error: `Anthropic API error: ${response.status}`,
        details: errorText 
      });
      return;
    }

    const data = await response.json();
    console.log('Successfully received response from Anthropic API');
    
    // Return the data directly to the client
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
} 