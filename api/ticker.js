function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return sendJson(res, 500, { error: 'Missing FINNHUB_API_KEY environment variable.' });

    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) return sendJson(res, 400, { error: 'Missing ticker symbol.' });

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) return sendJson(res, 500, { error: 'Could not reach quote provider.' });

    const data = await response.json();
    const price = Number(data.c);
    if (!Number.isFinite(price) || price === 0) return sendJson(res, 404, { error: `No live quote found for ${symbol}.` });

    sendJson(res, 200, {
      quote: {
        symbol,
        price,
        change: Number.isFinite(Number(data.d)) ? Number(data.d) : 0,
        percentChange: Number.isFinite(Number(data.dp)) ? Number(data.dp) : 0,
        previousClose: Number.isFinite(Number(data.pc)) ? Number(data.pc) : null
      }
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Ticker lookup failed.' });
  }
};
