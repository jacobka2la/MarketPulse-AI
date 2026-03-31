const { placeOrder } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { symbol, qty, side, type, limit_price } = req.body || {};
    if (!symbol || !qty || !side || !type) {
      return res.status(400).json({ error: 'Missing required trade fields.' });
    }

    const payload = {
      symbol: String(symbol).trim().toUpperCase(),
      qty: String(qty),
      side,
      type,
      time_in_force: 'day'
    };

    if (type === 'limit') {
      if (!limit_price) return res.status(400).json({ error: 'Missing limit price.' });
      payload.limit_price = String(limit_price);
    }

    const order = await placeOrder(payload);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
