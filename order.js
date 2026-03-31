const { APCA_KEY, APCA_SECRET, APCA_BASE } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (!APCA_KEY || !APCA_SECRET) return res.status(400).json({ error: 'Trade page is not connected to Alpaca yet.' });

    const { symbol, qty, side } = req.body || {};
    if (!symbol || !qty || !side) return res.status(400).json({ error: 'Missing symbol, qty, or side.' });

    const response = await fetch(`${APCA_BASE}/v2/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'APCA-API-KEY-ID': APCA_KEY,
        'APCA-API-SECRET-KEY': APCA_SECRET
      },
      body: JSON.stringify({
        symbol: String(symbol).toUpperCase(),
        qty: String(qty),
        side,
        type: 'market',
        time_in_force: 'day'
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: data.message || 'Order failed.' });
    res.status(200).json({ symbol: data.symbol, qty: data.qty, side: data.side, status: data.status });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Order failed.' });
  }
};
