const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root", // your MySQL username
  password: "root", // your MySQL password (keep empty if none)
  database: "portfolio_builder", // your created DB name
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    throw err;
  }
  console.log("✅ Connected to MySQL database");
});

module.exports = db;
