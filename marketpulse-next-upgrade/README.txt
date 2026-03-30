MARKETPULSE NEXT STEP BUILD

What this version adds:
- ticker search
- rule-based buy / avoid signal engine
- ranked scanner using a real watchlist
- Alpaca paper trading panel
- stronger UI and trading-focused layout

IMPORTANT:
These are real-data signals, but they are still signals.
They are not guaranteed winners.

FILES YOU SHOULD HAVE AT REPO ROOT:
- index.html
- styles.css
- script.js
- vercel.json
- api/

FILES INSIDE api/:
- _lib.js
- market-overview.js
- ticker.js
- news.js
- order.js

VERCEL ENVIRONMENT VARIABLES TO ADD:
- APCA_API_KEY_ID = your Alpaca paper key
- APCA_API_SECRET_KEY = your Alpaca paper secret
- APCA_API_BASE_URL = https://paper-api.alpaca.markets
- ALPHA_VANTAGE_API_KEY = your Alpha Vantage key

HOW TO UPDATE GITHUB:
1. Open your repo.
2. Delete the old index.html, styles.css, script.js, and vercel.json.
3. Upload the new files from this package.
4. Upload the full api folder too.
5. Commit changes.

HOW TO UPDATE VERCEL:
1. Go to project settings.
2. Add the env vars above.
3. Redeploy.

WHAT IS ACTUALLY POWERING THE SIGNALS:
- Alpaca stock snapshots and historical daily bars for price / trend / volume
- Alpha Vantage news sentiment when available
- Rule logic using price vs SMA20, SMA20 vs SMA50, RSI, breakout context, daily move, and sentiment

CURRENT LIMITATION:
The scanner is based on a curated watchlist right now, not the entire market.
That keeps it fast and stable while you test your private version.

NEXT UPGRADE LATER:
- bigger scan universe
- user accounts
- saved watchlists
- live websocket streaming
- tighter order and risk controls
