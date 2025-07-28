const express = require('express');
const cors = require('cors');
const app = express();

// ✅ Restrict CORS to only your Netlify frontend
app.use(cors({
  origin: 'https://spontaneous-tiramisu-59dd23.netlify.app'
}));

app.use(express.json());

// In-memory storage for portfolios
const portfolios = {};

// ✅ POST: Save portfolio by ID
app.post('/api/portfolio', (req, res) => {
  const { id, data } = req.body;

  if (!id || !data) {
    return res.status(400).json({ error: 'ID and data are required' });
  }

  portfolios[id] = data;
  res.json({ message: 'Portfolio saved successfully' });
});

// ✅ GET: Retrieve portfolio by ID
app.get('/api/portfolio/:id', (req, res) => {
  const id = req.params.id;
  const portfolio = portfolios[id];

  if (!portfolio) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(portfolio);
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
