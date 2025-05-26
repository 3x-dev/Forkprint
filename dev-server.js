const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Import your Vercel function
const generateRecipes = require('./api/generate-recipes.js').default;

// Create a wrapper to make it work with Express
app.post('/api/generate-recipes', async (req, res) => {
  // Create mock Vercel request/response objects
  const mockReq = {
    method: 'POST',
    body: req.body
  };
  
  const mockRes = {
    setHeader: (key, value) => res.setHeader(key, value),
    status: (code) => ({ 
      json: (data) => res.status(code).json(data),
      end: () => res.status(code).end()
    }),
    json: (data) => res.json(data)
  };
  
  await generateRecipes(mockReq, mockRes);
});

app.listen(PORT, () => {
  console.log(`Dev API server running on http://localhost:${PORT}`);
}); 