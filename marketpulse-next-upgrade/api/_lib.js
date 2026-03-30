const WATCHLIST = ['NVDA', 'AAPL', 'MSFT', 'AMD', 'TSLA', 'META', 'AMZN', 'GOOGL', 'PLTR', 'AVGO', 'NFLX', 'SPY'];

const ALPACA_DATA_URL = 'https://data.alpaca.markets/v2';
const ALPACA_TRADING_URL = process.env.APCA_API_BASE_URL || 'https://paper-api.alpaca.markets';

function getAlpacaHeaders() {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  if (!key || !secret) throw new Error('Missing Alpaca environment variables.');
  return {
    'APCA-API-KEY-ID': key,
    'APCA-API-SECRET-KEY': secret,
    'Content-Type': 'application/json'
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return 100 - (100 / (1 + rs));
}

function summarizeSentiment(feed = []) {
  if (!feed.length) return 0;
  const scores = feed
    .map((item) => Number(item.overall_sentiment_score))
    .filter((value) => Number.isFinite(value));
  if (!scores.length) return 0;
  return average(scores);
}

function buildSignal(symbol, snapshot, bars, newsFeed = []) {
  const dailyBar = snapshot.dailyBar || {};
  const prevDailyBar = snapshot.prevDailyBar || {};
  const minuteBar = snapshot.minuteBar || {};
  const closes = bars.map((bar) => Number(bar.c)).filter(Number.isFinite);
  const volumes = bars.map((bar) => Number(bar.v)).filter(Number.isFinite);
  const currentPrice = Number(dailyBar.c || minuteBar.c || prevDailyBar.c || 0);
  const prevClose = Number(prevDailyBar.c || 0);
  const changePercent = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
  const sma20 = closes.length >= 20 ? average(closes.slice(-20)) : currentPrice;
  const sma50 = closes.length >= 50 ? average(closes.slice(-50)) : sma20;
  const rsi14 = rsi(closes, 14);
  const avgVolume20 = volumes.length >= 20 ? average(volumes.slice(-20)) : 0;
  const todayVolume = Number(dailyBar.v || minuteBar.v || 0);
  const recentHigh20 = closes.length >= 20 ? Math.max(...closes.slice(-20)) : currentPrice;
  const sentiment = summarizeSentiment(newsFeed);

  let score = 0;
  const reasonTags = [];

  if (currentPrice > sma20) {
    score += 20;
    reasonTags.push('price above 20-day average');
  } else {
    score -= 12;
    reasonTags.push('price under 20-day average');
  }

  if (sma20 > sma50) {
    score += 20;
    reasonTags.push('20-day trend above 50-day trend');
  } else {
    score -= 12;
    reasonTags.push('short trend weaker than base trend');
  }

  if (Number.isFinite(rsi14) && rsi14 >= 52 && rsi14 <= 68) {
    score += 16;
    reasonTags.push(`RSI in momentum zone (${rsi14.toFixed(1)})`);
  } else if (Number.isFinite(rsi14) && rsi14 > 74) {
    score -= 10;
    reasonTags.push(`RSI overheated (${rsi14.toFixed(1)})`);
  } else if (Number.isFinite(rsi14)) {
    reasonTags.push(`RSI neutral (${rsi14.toFixed(1)})`);
  }

  if (todayVolume > avgVolume20 * 1.1 && avgVolume20 > 0) {
    score += 12;
    reasonTags.push('volume running above recent average');
  }

  if (currentPrice >= recentHigh20 * 0.99) {
    score += 14;
    reasonTags.push('trading near 20-day breakout zone');
  }

  if (changePercent > 1.2) {
    score += 8;
    reasonTags.push('positive daily momentum');
  } else if (changePercent < -1.5) {
    score -= 8;
    reasonTags.push('weak daily momentum');
  }

  if (sentiment > 0.15) {
    score += 10;
    reasonTags.push('news sentiment leaning positive');
  } else if (sentiment < -0.15) {
    score -= 10;
    reasonTags.push('news sentiment leaning negative');
  }

  score = Math.max(1, Math.min(99, Math.round(score + 50)));

  let bias = 'Hold / Neutral';
  if (score >= 72) bias = 'Buy Setup';
  else if (score <= 40) bias = 'Avoid / Weak';

  const sellTrigger = Math.max(currentPrice * 0.965, sma20 * 0.99);
  const bullCase = `${symbol} keeps holding above the 20-day trend and presses through recent highs with momentum staying healthy.`;
  const bearCase = `${symbol} loses the short-term trend, cools off below the 20-day average, or rolls over on weak breadth and negative headlines.`;
  const summary = `${symbol} scores ${score}/100 because ${reasonTags.slice(0, 3).join(', ')}.`;

  return {
    symbol,
    price: Number(currentPrice.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    score,
    bias,
    sellTrigger: Number(sellTrigger.toFixed(2)),
    bullCase,
    bearCase,
    summary,
    reasonTags,
    indicators: {
      sma20: Number(sma20.toFixed(2)),
      sma50: Number(sma50.toFixed(2)),
      rsi14: Number.isFinite(rsi14) ? Number(rsi14.toFixed(1)) : null,
      avgVolume20: Math.round(avgVolume20),
      todayVolume: Math.round(todayVolume),
      sentiment: Number(sentiment.toFixed(2))
    }
  };
}

async function fetchSnapshots(symbols) {
  const url = `${ALPACA_DATA_URL}/stocks/snapshots?symbols=${symbols.join(',')}`;
  const data = await fetchJson(url, { headers: getAlpacaHeaders() });
  return data;
}

async function fetchBars(symbol, limit = 60) {
  const params = new URLSearchParams({
    timeframe: '1Day',
    limit: String(limit),
    adjustment: 'raw',
    feed: 'iex'
  });
  const url = `${ALPACA_DATA_URL}/stocks/${encodeURIComponent(symbol)}/bars?${params}`;
  const data = await fetchJson(url, { headers: getAlpacaHeaders() });
  return data.bars || [];
}

async function fetchTickerNews(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&limit=6&apikey=${apiKey}`;
  const data = await fetchJson(url);
  return data.feed || [];
}

async function fetchGeneralNews() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets&limit=6&apikey=${apiKey}`;
  const data = await fetchJson(url);
  return data.feed || [];
}

async function fetchAccount() {
  return fetchJson(`${ALPACA_TRADING_URL}/v2/account`, { headers: getAlpacaHeaders() });
}

async function fetchPositions() {
  return fetchJson(`${ALPACA_TRADING_URL}/v2/positions`, { headers: getAlpacaHeaders() });
}

async function placeOrder(body) {
  return fetchJson(`${ALPACA_TRADING_URL}/v2/orders`, {
    method: 'POST',
    headers: getAlpacaHeaders(),
    body: JSON.stringify(body)
  });
}

module.exports = {
  WATCHLIST,
  fetchBars,
  fetchSnapshots,
  fetchTickerNews,
  fetchGeneralNews,
  fetchAccount,
  fetchPositions,
  placeOrder,
  buildSignal
};
