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

    // Proxy request to Python carbon tracking service
    console.log('Node.js API: Proxying request to Python carbon tracking service...');
    
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    const response = await fetch(`${pythonServiceUrl}/api/sustainability-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stats }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Python service error: ${response.status} ${errorText}`);
      return res.status(response.status).json({ 
        error: `Python service error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    console.log('Node.js API: Successfully received response from Python carbon tracking service.');
    return res.status(200).json(result);

  } catch (error) {
    console.error('Node.js API: Server error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 