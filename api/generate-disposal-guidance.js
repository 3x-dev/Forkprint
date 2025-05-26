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
    const { foodItem, amount, daysPast, expiryDate } = req.body;
    
    if (!foodItem) {
      res.status(400).json({ error: 'Food item name is required' });
      return;
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'Anthropic API key not configured on server' });
      return;
    }
    
    const prompt = `
You are a food safety and disposal expert. Please provide detailed guidance for disposing of an expired food item.

Food Item: ${foodItem}
Amount: ${amount || 'Not specified'}
Days Expired: ${daysPast} day${daysPast !== 1 ? 's' : ''}
Expiry Date: ${expiryDate}

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

    console.log('Making request to Anthropic API for disposal guidance...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.3,
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