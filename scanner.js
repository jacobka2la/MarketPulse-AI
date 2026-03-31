const {
  WATCHLIST,
  LOCAL_SYMBOLS,
  fetchSnapshots,
  fetchBars,
  fetchTickerNews,
  buildSignal
} = require('./_lib');

const nameMap = Object.fromEntries(LOCAL_SYMBOLS.map((item) => [item.symbol, item.name]));

module.exports = async (req, res) => {
  try {
    const snapshots = await fetchSnapshots(WATCHLIST);
    const picks = await Promise.all(WATCHLIST.map(async (symbol) => {
      const [bars, newsFeed] = await Promise.all([
        fetchBars(symbol, 60),
        fetchTickerNews(symbol).catch(() => [])
      ]);
      return buildSignal(symbol, snapshots[symbol] || {}, bars, newsFeed, nameMap[symbol] || symbol);
    }));

    picks.sort((a, b) => b.score - a.score);
    res.status(200).json({ picks, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
