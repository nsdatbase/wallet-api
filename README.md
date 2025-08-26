# wallet-api

Simple Express API for storing and fetching wallet addresses.

## Routes
- GET /wallets → returns ["0x...", "0x..."]
- POST /wallets with JSON { "address": "0x..." } → saves it

## Env (Railway)
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- CORS_ORIGIN (optional)
- API_KEY (optional; if set, send header x-api-key: <value>)

## SQL (MySQL)
```sql
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  address VARCHAR(255) NOT NULL
);