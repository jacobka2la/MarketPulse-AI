const { searchSymbols } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const results = await searchSymbols(q);
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
