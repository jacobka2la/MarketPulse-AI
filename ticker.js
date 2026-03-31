const {
  LOCAL_SYMBOLS,
  fetchSnapshots,
  fetchBars,
  fetchTickerNews,
  buildSignal
} = require('./_lib');

const nameMap = Object.fromEntries(LOCAL_SYMBOLS.map((item) => [item.symbol, item.name]));

module.exports = async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'Missing symbol.' });

    const [snapshots, bars, newsFeed] = await Promise.all([
      fetchSnapshots([symbol]),
      fetchBars(symbol, 60),
      fetchTickerNews(symbol).catch(() => [])
    ]);

    const signal = buildSignal(symbol, snapshots[symbol] || {}, bars, newsFeed, nameMap[symbol] || symbol);
    signal.news = newsFeed.slice(0, 6).map((item) => ({
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source
    }));

    res.status(200).json(signal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
