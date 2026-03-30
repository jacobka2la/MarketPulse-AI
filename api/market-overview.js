function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function buildQuote(symbol, raw) {
  const price = Number(raw.c);
  const change = Number(raw.d);
  const percentChange = Number(raw.dp);
  const previousClose = Number(raw.pc);
  if (!Number.isFinite(price)) return null;
  return {
    symbol,
    price,
    change: Number.isFinite(change) ? change : 0,
    percentChange: Number.isFinite(percentChange) ? percentChange : 0,
    previousClose: Number.isFinite(previousClose) ? previousClose : null
  };
}

async function getFinnhubQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub quote failed for ${symbol}`);
  const data = await response.json();
  return buildQuote(symbol, data);
}

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return sendJson(res, 500, { error: 'Missing FINNHUB_API_KEY environment variable.' });

    const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols : 'NVDA,AAPL,AMD,TSLA,MSFT,META';
    const symbols = rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 12);

    const quoteResults = await Promise.all(symbols.map(async (symbol) => {
      try { return await getFinnhubQuote(symbol, apiKey); } catch { return null; }
    }));

    const watchlist = quoteResults.filter(Boolean).sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
    sendJson(res, 200, { marketOpen: true, watchlist, topMover: watchlist[0] || null });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Could not load market overview.' });
  }
};
