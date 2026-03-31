MARKETPULSE AI - MULTI PAGE VERSION

DELETE THESE FROM YOUR REPO FIRST:
- index.html
- styles.css
- script.js
- vercel.json
- README.txt
- everything inside the api folder

THEN UPLOAD THESE EXACT FILES:
- index.html
- scanner.html
- search.html
- news.html
- trade.html
- styles.css
- script.js
- vercel.json
- README.txt
- api/_lib.js
- api/scanner.js
- api/ticker.js
- api/search.js
- api/news.js
- api/account.js
- api/order.js

KEEP / ADD THESE VERCEL ENV VARS:
- FINNHUB_API_KEY
- ALPHA_VANTAGE_API_KEY
- APCA_API_KEY_ID
- APCA_API_SECRET_KEY
- APCA_API_BASE_URL=https://paper-api.alpaca.markets

AFTER UPLOADING:
- redeploy in Vercel

WHAT CHANGED:
- tabs go to separate pages now
- removed the Vercel / deploy-safe wording from the site copy
- added longer stock explanations
- added live search suggestions while typing
- trade flow has its own page
