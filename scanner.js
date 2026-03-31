const { WATCHLIST, getFinnhubQuote, getFinnhubProfile, buildSignal } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const stocks = [];
    for (const symbol of WATCHLIST) {
      try {
        const [quote, profile] = await Promise.all([
          getFinnhubQuote(symbol),
          getFinnhubProfile(symbol)
        ]);
        stocks.push(buildSignal(symbol, quote, profile));
      } catch (err) {
        stocks.push({ symbol, signal: 'Unavailable', score: 0, price: null, changePercent: null, sellTrigger: '--', summary: err.message, bullCase: 'Unavailable.', bearCase: 'Unavailable.', risk: 'Unavailable.' });
      }
    }
    stocks.sort((a, b) => (b.score || 0) - (a.score || 0));
    res.status(200).json({ stocks });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Scanner failed.' });
  }
};
