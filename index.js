const express = require("express");
const app = express();
const port = 3000;

const cors = require("cors");
app.use(cors()); // Allow frontend (127.0.0.1:5500) to call backend

// const db = require("./config/db"); // Connect to MySQL

app.use(express.json());

// ✅ Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// ✅ File upload route
const resumeRoute = require("./routes/resume");
app.use("/api/resume", resumeRoute);

// ✅ Hello test route
const helloRoute = require("./routes/hello");
app.use("/hello", helloRoute);

// ✅ Default test route
app.get("/", (req, res) => {
  res.send("Welcome to Express Backend!");
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
