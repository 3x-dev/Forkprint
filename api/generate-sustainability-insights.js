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

    // CodeCarbon integration removed. Return a placeholder response.
    // TODO: Implement sustainability insights logic directly here if needed.
    return res.status(200).json({
      insights: [
        {
          type: "environmental_impact",
          title: "Placeholder Insight",
          description: "This is a placeholder response. CodeCarbon integration has been removed.",
          actionItems: ["Replace with real logic."]
        }
      ]
    });
  } catch (error) {
    console.error('Node.js API: Server error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 