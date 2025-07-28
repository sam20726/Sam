const express = require("express");
const cors = require("cors");
const app = express();

// ✅ Restrict CORS to only your Netlify frontend and local dev
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'https://spontaneous-tiramisu-59dd23.netlify.app'
  ]
}));

app.use(express.json());

// ✅ Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// ✅ File upload route
const resumeRoute = require("./routes/resume");
app.use("/api/resume", resumeRoute);

// ✅ Portfolio save/load route (in-memory)
const portfolios = {};
app.post("/api/portfolio", (req, res) => {
  const { id, data } = req.body;
  if (!id || !data) {
    return res.status(400).json({ error: "ID and data are required" });
  }
  portfolios[id] = data;
  res.json({ message: "Portfolio saved successfully" });
});

app.get("/api/portfolio/:id", (req, res) => {
  const id = req.params.id;
  const portfolio = portfolios[id];
  if (!portfolio) {
    return res.status(404).json({ error: "Portfolio not found" });
  }
  res.json(portfolio);
});

// ✅ Hello test route
const helloRoute = require("./routes/hello");
app.use("/hello", helloRoute);

// ✅ Default test route
app.get("/", (req, res) => {
  res.send("Welcome to Express Backend!");
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
