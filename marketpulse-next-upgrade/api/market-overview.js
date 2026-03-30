const {
  WATCHLIST,
  fetchSnapshots,
  fetchBars,
  fetchTickerNews,
  fetchAccount,
  fetchPositions,
  buildSignal
} = require('./_lib');

module.exports = async (req, res) => {
  try {
    const snapshots = await fetchSnapshots(WATCHLIST);
    const picks = await Promise.all(WATCHLIST.map(async (symbol) => {
      const [bars, newsFeed] = await Promise.all([
        fetchBars(symbol, 60),
        fetchTickerNews(symbol).catch(() => [])
      ]);
      return buildSignal(symbol, snapshots[symbol] || {}, bars, newsFeed);
    }));

    picks.sort((a, b) => b.score - a.score);

    const [account, positions] = await Promise.all([
      fetchAccount().catch(() => null),
      fetchPositions().catch(() => [])
    ]);

    res.status(200).json({
      marketState: 'Live Scanner',
      picks,
      account,
      positions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
