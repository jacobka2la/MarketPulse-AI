const { fetchGeneralNews } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const feed = await fetchGeneralNews();
    const items = feed.slice(0, 8).map((item) => ({
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source,
      sentiment: item.overall_sentiment_label || 'Neutral'
    }));
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
