const { getFinnhubQuote, getFinnhubProfile, buildSignal } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'Missing symbol.' });
    const [quote, profile] = await Promise.all([
      getFinnhubQuote(symbol),
      getFinnhubProfile(symbol)
    ]);
    const out = buildSignal(symbol, quote, profile);
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ticker lookup failed.' });
  }
};
