const { ALPHA, getJson } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (!ALPHA) return res.status(500).json({ error: 'Missing ALPHA_VANTAGE_API_KEY in Vercel.' });
    const data = await getJson(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=technology,earnings,financial_markets&sort=LATEST&limit=9&apikey=${ALPHA}`);
    const news = (data.feed || []).slice(0, 9).map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary || 'No summary available.'
    }));
    res.status(200).json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message || 'News failed.' });
  }
};
