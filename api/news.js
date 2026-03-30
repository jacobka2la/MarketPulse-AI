function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return sendJson(res, 500, { error: 'Missing ALPHA_VANTAGE_API_KEY environment variable.' });

    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets&sort=LATEST&limit=6&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) return sendJson(res, 500, { error: 'Could not reach news provider.' });

    const data = await response.json();
    const feed = Array.isArray(data.feed) ? data.feed : [];
    const articles = feed.slice(0, 6).map((item) => ({
      headline: item.title || 'Headline unavailable',
      source: item.source || 'Market',
      summary: item.summary ? String(item.summary).slice(0, 220) + (String(item.summary).length > 220 ? '...' : '') : 'No summary available.',
      url: item.url || ''
    }));

    sendJson(res, 200, { articles });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'News lookup failed.' });
  }
};
