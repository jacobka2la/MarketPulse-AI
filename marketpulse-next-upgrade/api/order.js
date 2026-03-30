const { placeOrder } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const symbol = String(body.symbol || '').trim().toUpperCase();
    const qty = Number(body.qty);
    const side = body.side;
    const type = body.type || 'market';

    if (!symbol) return res.status(400).json({ error: 'Missing symbol.' });
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid quantity.' });
    if (!['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'Invalid side.' });
    if (!['market', 'limit'].includes(type)) return res.status(400).json({ error: 'Invalid order type.' });

    const payload = {
      symbol,
      qty: String(qty),
      side,
      type,
      time_in_force: 'day'
    };

    if (type === 'limit') {
      const limitPrice = Number(body.limit_price);
      if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
        return res.status(400).json({ error: 'Invalid limit price.' });
      }
      payload.limit_price = String(limitPrice);
    }

    const order = await placeOrder(payload);
    res.status(200).json({
      id: order.id,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side,
      type: order.type,
      status: order.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
