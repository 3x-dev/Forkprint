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
    const { stats } = req.body; // Expecting 'stats' object from the client

    if (!stats) {
      return res.status(400).json({ error: 'Invalid stats provided' });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured on server' });
    }

    const prompt = `
You are a sustainability coach analyzing packaging choices. Based on these user stats:

- Total recent purchases: ${stats.totalItems}
- Low-waste choices: ${stats.lowWasteItems}/${stats.totalItems} (${stats.totalItems > 0 ? Math.round((stats.lowWasteItems/stats.totalItems) * 100) : 0}%)
- Sustainable switches made: ${stats.sustainableSwitches}
- Common high-waste packaging: ${stats.commonHighWastePackaging.join(', ') || 'None'}
- Frequently bought items: ${Object.entries(stats.mostLoggedFoods).slice(0, 5).map(([food, count]) => `${food} (${count}x)`).join(', ') || 'None'}

Generate 3-4 personalized sustainability insights following this JSON format strictly:
{
  "insights": [
    {
      "type": "environmental_impact/improvement_suggestion/achievement/challenge",
      "title": "Insight title",
      "description": "Detailed description with specific data",
      "actionItems": ["Specific action 1", "Specific action 2"]
    }
  ]
}

Focus on:
1. Environmental impact calculations (if applicable and simple)
2. Specific improvement suggestions  
3. Celebrating achievements
4. Personalized challenges
Ensure the output is a valid JSON object starting with { and ending with }. Do not include any text before or after the JSON structure.
    `.trim();

    console.log('API Function: Making request to Anthropic for sustainability insights...');
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