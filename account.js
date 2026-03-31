const { fetchAccount, fetchPositions } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const [account, positions] = await Promise.all([
      fetchAccount(),
      fetchPositions().catch(() => [])
    ]);
    res.status(200).json({ account, positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
