const LOCAL_SYMBOLS = [
  ['AAPL', 'Apple Inc.'],
  ['AMD', 'Advanced Micro Devices'],
  ['AMZN', 'Amazon.com Inc.'],
  ['AVGO', 'Broadcom Inc.'],
  ['BABA', 'Alibaba Group'],
  ['COIN', 'Coinbase Global'],
  ['CRM', 'Salesforce Inc.'],
  ['DIS', 'Walt Disney Co.'],
  ['GOOGL', 'Alphabet Inc.'],
  ['HOOD', 'Robinhood Markets'],
  ['INTC', 'Intel Corp.'],
  ['IONQ', 'IonQ Inc.'],
  ['META', 'Meta Platforms'],
  ['MSFT', 'Microsoft Corp.'],
  ['NFLX', 'Netflix Inc.'],
  ['NVDA', 'NVIDIA Corp.'],
  ['ORCL', 'Oracle Corp.'],
  ['PLTR', 'Palantir Technologies'],
  ['QQQ', 'Invesco QQQ Trust'],
  ['RBLX', 'Roblox Corp.'],
  ['SHOP', 'Shopify Inc.'],
  ['SMCI', 'Super Micro Computer'],
  ['SOFI', 'SoFi Technologies'],
  ['SPY', 'SPDR S&P 500 ETF'],
  ['TSLA', 'Tesla Inc.'],
  ['UBER', 'Uber Technologies']
].map(([symbol, name]) => ({ symbol, name }));

const WATCHLIST = ['NVDA', 'MSFT', 'AAPL', 'AMD', 'META', 'AMZN', 'AVGO', 'PLTR', 'TSLA', 'NFLX', 'GOOGL', 'SPY'];

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

function round(num, digits = 2) {
  return Number(Number(num).toFixed(digits));
}

function getTag(score) {
  if (score >= 78) return 'Bullish Buy';
  if (score >= 63) return 'Bullish Watch';
  if (score <= 38) return 'Bearish / Avoid';
  return 'Neutral / Wait';
}

function buildNarrative(symbol, indicators, score, bias, changePercent) {
  const {
    currentPrice, sma20, sma50, rsi14, avgVolume20, todayVolume, recentHigh20, sentiment
  } = indicators;

  const trendText = currentPrice > sma20 && sma20 > sma50
    ? `${symbol} is trading above both its 20-day and 50-day trend lines, which usually means buyers still control the short and medium-term structure.`
    : currentPrice < sma20 && sma20 < sma50
      ? `${symbol} is trading below both its 20-day and 50-day trend lines, which is a weak setup because sellers still control the structure.`
      : `${symbol} is mixed right now because price and trend averages are not fully aligned yet.`;

  const momentumText = Number.isFinite(rsi14)
    ? rsi14 >= 52 && rsi14 <= 68
      ? `Momentum is in a healthy zone with RSI around ${rsi14.toFixed(1)}, which is strong enough to support upside without screaming overbought.`
      : rsi14 > 74
        ? `Momentum is hot with RSI around ${rsi14.toFixed(1)}, which can keep ripping, but it also raises the odds of a pullback or chop.`
        : `Momentum is not fully convincing yet with RSI around ${rsi14.toFixed(1)}, so the move may still need confirmation.`
    : 'Momentum data is still too thin to give a clean RSI read.';

  const volumeText = avgVolume20 > 0
    ? todayVolume > avgVolume20 * 1.15
      ? `Volume is running well above the recent 20-day average, which matters because bigger participation makes the move more believable.`
      : `Volume is not exploding above normal yet, so this move has less confirmation than a true high-participation breakout.`
    : 'Volume context is limited right now.';

  const sentimentText = sentiment > 0.15
    ? `News tone is leaning positive, which gives the chart some help instead of fighting it.`
    : sentiment < -0.15
      ? `News tone is leaning negative, which makes the setup more fragile even if the chart still looks okay.`
      : `News tone is not strongly helping or hurting the setup right now.`;

  const breakoutText = currentPrice >= recentHigh20 * 0.99
    ? `Price is pressing close to its 20-day high zone, so a clean push can act like a breakout continuation setup.`
    : `Price is not yet pressing the recent high zone, so this is more of a developing setup than a full breakout.`;

  const stance = bias === 'Bullish Buy'
    ? `That is why the model is leaning bullish right now. It is not blind hype — the score is coming from trend, momentum, and participation lining up in a real way.`
    : bias === 'Bearish / Avoid'
      ? `That is why the model is leaning bearish right now. The setup is not trash forever, but the current evidence does not support chasing it as a buy.`
      : `That is why the model is staying patient right now. There are some decent signs, but not enough stacked evidence to call it a strong buy yet.`;

  const summary = `${trendText} ${momentumText} ${volumeText} ${breakoutText} ${sentimentText} ${stance}`;

  const bullCase = `${symbol} becomes more attractive if it keeps holding above the 20-day trend near ${round(sma20)} and then pushes through the recent high zone around ${round(recentHigh20)} with solid volume. If that happens while momentum stays firm and headlines do not turn ugly, the move can keep extending instead of fading.`;

  const bearCase = `${symbol} loses the plot if it slips back under the 20-day trend near ${round(sma20)} or starts failing around recent highs with weak participation. A nasty fade after a hot move, especially with negative headlines or an RSI roll-over, would make this look more like distribution than strength.`;

  const tradingPlan = bias === 'Bullish Buy'
    ? `Best case, this is a buy-on-strength or buy-on-pullback-to-support setup. The cleaner entries are either a breakout over recent highs or a controlled pullback that respects the short-term trend.`
    : bias === 'Bearish / Avoid'
      ? `Best move right now is to stay off it or treat it as a fade/watch-only setup until the chart rebuilds. Buying here would mean fighting the current evidence.`
      : `Best move right now is patience. Let the chart either tighten up into a stronger base or prove strength with better trend and volume confirmation.`;

  return {
    summary,
    bullCase,
    bearCase,
    tradingPlan
  };
}

function buildSignal(symbol, snapshot, bars, newsFeed = [], name = '') {
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

  let score = 50;
  const reasonTags = [];

  if (currentPrice > sma20) {
    score += 16;
    reasonTags.push('price is above the 20-day trend');
  } else {
    score -= 14;
    reasonTags.push('price is below the 20-day trend');
  }

  if (sma20 > sma50) {
    score += 18;
    reasonTags.push('short-term trend is stronger than the base trend');
  } else {
    score -= 14;
    reasonTags.push('short-term trend is weaker than the base trend');
  }

  if (Number.isFinite(rsi14) && rsi14 >= 52 && rsi14 <= 68) {
    score += 14;
    reasonTags.push(`RSI is in a healthy momentum zone at ${rsi14.toFixed(1)}`);
  } else if (Number.isFinite(rsi14) && rsi14 > 74) {
    score -= 8;
    reasonTags.push(`RSI is overheated at ${rsi14.toFixed(1)}`);
  } else if (Number.isFinite(rsi14) && rsi14 < 45) {
    score -= 8;
    reasonTags.push(`RSI is soft at ${rsi14.toFixed(1)}`);
  } else if (Number.isFinite(rsi14)) {
    reasonTags.push(`RSI is neutral at ${rsi14.toFixed(1)}`);
  }

  if (avgVolume20 > 0 && todayVolume > avgVolume20 * 1.12) {
    score += 10;
    reasonTags.push('volume is running above its recent average');
  } else {
    reasonTags.push('volume is not strongly confirming the move');
  }

  if (currentPrice >= recentHigh20 * 0.99) {
    score += 12;
    reasonTags.push('price is pressing the recent breakout zone');
  }

  if (changePercent > 1.5) {
    score += 7;
    reasonTags.push('daily momentum is positive');
  } else if (changePercent < -1.5) {
    score -= 7;
    reasonTags.push('daily momentum is weak');
  }

  if (sentiment > 0.15) {
    score += 8;
    reasonTags.push('headline sentiment is leaning positive');
  } else if (sentiment < -0.15) {
    score -= 8;
    reasonTags.push('headline sentiment is leaning negative');
  }

  score = Math.max(1, Math.min(99, Math.round(score)));
  const bias = getTag(score);
  const sellTrigger = Math.max(currentPrice * 0.965, sma20 * 0.99);

  const indicators = {
    currentPrice,
    sma20,
    sma50,
    rsi14,
    avgVolume20,
    todayVolume,
    recentHigh20,
    sentiment
  };

  const narrative = buildNarrative(symbol, indicators, score, bias, changePercent);

  return {
    symbol,
    name: name || symbol,
    price: round(currentPrice),
    changePercent: round(changePercent),
    score,
    bias,
    sellTrigger: round(sellTrigger),
    summary: narrative.summary,
    bullCase: narrative.bullCase,
    bearCase: narrative.bearCase,
    tradingPlan: narrative.tradingPlan,
    reasonTags,
    indicators: {
      sma20: round(sma20),
      sma50: round(sma50),
      rsi14: Number.isFinite(rsi14) ? round(rsi14, 1) : null,
      avgVolume20: Math.round(avgVolume20),
      todayVolume: Math.round(todayVolume),
      sentiment: round(sentiment, 2)
    }
  };
}

async function fetchSnapshots(symbols) {
  const url = `${ALPACA_DATA_URL}/stocks/snapshots?symbols=${symbols.join(',')}`;
  return fetchJson(url, { headers: getAlpacaHeaders() });
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
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets&limit=8&apikey=${apiKey}`;
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

async function searchSymbols(query) {
  const q = String(query || '').trim().toUpperCase();
  if (!q) return LOCAL_SYMBOLS.slice(0, 8);

  const localMatches = LOCAL_SYMBOLS.filter((item) =>
    item.symbol.startsWith(q) || item.name.toUpperCase().includes(q)
  ).slice(0, 8);

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey || q.length < 1) return localMatches;

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${finnhubKey}`;
    const data = await fetchJson(url);
    const remote = (data.result || [])
      .filter((item) => item.symbol && item.type === 'Common Stock')
      .map((item) => ({ symbol: item.symbol.toUpperCase(), name: item.description || item.symbol }))
      .filter((item, index, arr) => arr.findIndex((x) => x.symbol === item.symbol) === index)
      .slice(0, 8);

    const merged = [...localMatches];
    remote.forEach((item) => {
      if (!merged.find((x) => x.symbol === item.symbol)) merged.push(item);
    });
    return merged.slice(0, 8);
  } catch {
    return localMatches;
  }
}

module.exports = {
  LOCAL_SYMBOLS,
  WATCHLIST,
  fetchBars,
  fetchSnapshots,
  fetchTickerNews,
  fetchGeneralNews,
  fetchAccount,
  fetchPositions,
  placeOrder,
  searchSymbols,
  buildSignal
};
