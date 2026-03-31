const { APCA_KEY, APCA_SECRET, APCA_BASE, getJson } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (!APCA_KEY || !APCA_SECRET) {
      return res.status(200).json({ status: 'Trade page not connected', equity: null, cash: null, buying_power: null });
    }
    const data = await getJson(`${APCA_BASE}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': APCA_KEY,
        'APCA-API-SECRET-KEY': APCA_SECRET
      }
    });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Account lookup failed.' });
  }
};
