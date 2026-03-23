# API Reference

All endpoints are served by the Flask app (`src/web/app.py`).  Default base URL during local development is `http://localhost:8080`.

> The swap flow no longer hits the back-end — swaps are executed directly in the browser through KyberSwap.  Therefore there is only **one public endpoint**.

---
## 1 · Trading Data

### `GET /api/trading-data`
Returns consolidated ETH price, volume, Fear & Greed index and cached AI model decisions.

```jsonc
{
  "price_usd": 3125.55,
  "volume_24h": 14000000000,
  "fear_greed": 74,
  "models": {
    "gemini":  { "decision": "BUY",  "confidence": 0.82 },
    "groq":    { "decision": "HOLD", "confidence": 0.40 },
    "mistral": { "decision": "SELL", "confidence": 0.61 }
  }
}
```
Fields are refreshed every 60 s (price/volume) or 10 min (AI, sentiment) by a background scheduler inside `app.py`.

### Rate-Limit & Security
All routes are wrapped with **Flask-Limiter** (120 req/min per IP) and security headers via **Flask-Talisman** when those optional libraries are installed.

---
_Back to the [docs index](index.md)_ 