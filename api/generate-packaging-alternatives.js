// Helper for packaging types, assuming it might be needed or for consistency
const packagingTypes = [
  { id: 'NO_PACKAGING', label: 'No Packaging (e.g., loose produce)', isLowWaste: true },
  { id: 'BULK_OWN_CONTAINER', label: 'Bulk (dispensed into own container)', isLowWaste: true },
  // ... (include all packagingTypes from PackagingSwapPage.tsx if needed by the prompt logic here)
  // For this specific prompt, we only need the label if it's complex, otherwise, the string from client is fine.
  { id: 'PLASTIC_FILM', label: 'Plastic - Film (e.g., wrappers, bags)', isLowWaste: false },
  { id: 'OTHER_UNKNOWN', label: 'Other/Unknown', isLowWaste: false },
];


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { highWasteItems } = req.body;

    if (!highWasteItems || !Array.isArray(highWasteItems)) {
      return res.status(400).json({ error: 'Invalid highWasteItems provided' });
    }
    
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured on server' });
    }

    const itemsDescription = highWasteItems.map(item => {
        // Attempt to find a label for a more descriptive current packaging
        const packagingDetail = packagingTypes.find(p => p.id === item.packaging_type);
        const currentPackagingDescription = packagingDetail ? packagingDetail.label : item.packaging_type;
        return `${item.food_item_name} (currently packaged in: ${currentPackagingDescription})`;
      }
    ).join(', ');

    const prompt = `
You are a sustainability expert helping users reduce packaging waste. Given these food items with high-waste packaging:

${itemsDescription}

For each item, suggest better packaging alternatives following this JSON format strictly:
{
  "alternatives": [
    {
      "foodItem": "Item name",
      "currentPackaging": "Current packaging type (as provided in input, e.g., Plastic - Film)",
      "suggestedAlternative": "Better packaging option",
      "reasoning": "Why this alternative is better (brief)",
      "impactReduction": "Environmental benefit (e.g., '70% less plastic waste')",
      "whereToFind": "Where to find this alternative (specific stores/brands if possible, or general advice like 'Bulk section of grocery stores')",
      "difficultyLevel": "Easy/Medium/Hard"
    }
  ]
}

Focus on practical, realistic alternatives available in most areas. Consider bulk stores, farmer's markets, specific brands, or different store sections.
Ensure the output is a valid JSON object starting with { and ending with }. Do not include any text before or after the JSON structure.
    `.trim();
    
    console.log('API Function: Making request to Anthropic for packaging alternatives...');
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error(`Anthropic API error: ${anthropicResponse.status} ${errorText}`);
      return res.status(anthropicResponse.status).json({ error: `Anthropic API error: ${anthropicResponse.status}`, details: errorText });
    }

    const responseData = await anthropicResponse.json();
    
    if (responseData.content && responseData.content.length > 0 && responseData.content[0].text) {
        try {
            const parsedJson = JSON.parse(responseData.content[0].text);
            console.log('API Function: Successfully received and parsed response from Anthropic.');
            return res.status(200).json(parsedJson); // Return the parsed JSON directly
        } catch (e) {
            console.error('API Function: Error parsing JSON from Anthropic:', e);
            console.error('API Function: Raw text from Anthropic:', responseData.content[0].text);
            return res.status(500).json({ error: 'Failed to parse response from AI model.' });
        }
    } else {
        console.error('API Function: No content found in Anthropic response or unexpected format.');
        return res.status(500).json({ error: 'No content returned from AI model.' });
    }

  } catch (error) {
    console.error('API Function: Server error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 