const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());

// CORS setup
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));

// API Key check (optional)
const API_KEY = process.env.API_KEY || "";
function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.header("x-api-key");
  if (key && key === API_KEY) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render provides DATABASE_URL
  ssl: { rejectUnauthorized: false }
});

// Auto-create wallets table if not exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL
      )
    `);
    console.log("✅ Wallets table ready");
  } catch (err) {
    console.error("❌ Table creation failed:", err.message);
  }
})();

// Health Check
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: result.rows[0].ok === 1 });
  } catch {
    res.status(500).json({ ok: false, db: false });
  }
});

// Get all wallets
app.get("/wallets", requireApiKey, async (req, res) => {
  try {
    const result = await pool.query("SELECT address FROM wallets ORDER BY id DESC");
    const addresses = result.rows.map(r => r.address);
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
    await pool.query("INSERT INTO wallets (address) VALUES ($1)", [address.trim()]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Insert failed", details: err.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.json({ status: "wallet-api running (Postgres)" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API listening on port ${PORT}`);
});

