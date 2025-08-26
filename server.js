const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());

// CORS
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));

// Optional simple API key guard
const API_KEY = process.env.API_KEY || "";
function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // not enforced if empty
  const key = req.header("x-api-key");
  if (key && key === API_KEY) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// DB pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Railway MySQL uses SSL; if it complains locally, you can tweak:
  // ssl: { rejectUnauthorized: true }
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health
app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch {
    res.status(500).json({ ok: false, db: false });
  }
});

// Get all wallets (returns array of strings)
app.get("/wallets", requireApiKey, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT address FROM wallets ORDER BY id DESC"
    );
    const addresses = rows.map(r => r.address);
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: "DB query failed", details: err.message });
  }
});

// Save a wallet
app.post("/wallets", requireApiKey, async (req, res) => {
  try {
    const { address } = req.body || {};
    if (!address || typeof address !== "string" || address.trim().length < 4) {
      return res.status(400).json({ error: "Invalid address" });
    }
    await pool.query("INSERT INTO wallets (address) VALUES (?)", [address.trim()]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Insert failed", details: err.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.json({ status: "wallet-api running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(API listening on port ${PORT});
});