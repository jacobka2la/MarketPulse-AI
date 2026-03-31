const { FINNHUB, getJson } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (!FINNHUB) return res.status(500).json({ error: 'Missing FINNHUB_API_KEY in Vercel.' });
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(200).json({ results: [] });
    const data = await getJson(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB}`);
    const results = (data.result || [])
      .filter(item => item.symbol && item.type === 'Common Stock')
      .slice(0, 8)
      .map(item => ({ symbol: item.symbol, description: item.description }));
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Search failed.' });
  }
};
