const FINNHUB = process.env.FINNHUB_API_KEY;
const ALPHA = process.env.ALPHA_VANTAGE_API_KEY;
const APCA_KEY = process.env.APCA_API_KEY_ID;
const APCA_SECRET = process.env.APCA_API_SECRET_KEY;
const APCA_BASE = process.env.APCA_API_BASE_URL || 'https://paper-api.alpaca.markets';

const WATCHLIST = ['NVDA','AAPL','MSFT','AMZN','META','TSLA','AMD','GOOGL','NFLX','PLTR'];

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

async function getFinnhubQuote(symbol) {
  if (!FINNHUB) throw new Error('Missing FINNHUB_API_KEY in Vercel.');
  const q = await getJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB}`);
  if (!q || !q.c) throw new Error(`No quote returned for ${symbol}.`);
  return q;
}

async function getFinnhubProfile(symbol) {
  if (!FINNHUB) throw new Error('Missing FINNHUB_API_KEY in Vercel.');
  return getJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB}`);
}

function buildSignal(symbol, quote, profile = {}) {
  const price = Number(quote.c || 0);
  const prev = Number(quote.pc || 0);
  const open = Number(quote.o || 0);
  const high = Number(quote.h || 0);
  const low = Number(quote.l || 0);
  const changePercent = Number(quote.dp || 0);
  const intradayRange = high > low ? ((price - low) / (high - low)) * 100 : 50;
  const gap = prev ? ((open - prev) / prev) * 100 : 0;

  let score = 50;
  if (changePercent > 3) score += 18;
  else if (changePercent > 1) score += 10;
  else if (changePercent < -3) score -= 18;
  else if (changePercent < -1) score -= 10;

  if (gap > 1) score += 8;
  if (gap < -1) score -= 8;
  if (intradayRange > 70) score += 8;
  if (intradayRange < 30) score -= 8;
  if (price > prev) score += 6;
  if (price < prev) score -= 6;
  score = Math.max(1, Math.min(99, Math.round(score)));

  let signal = 'Neutral / Wait';
  if (score >= 68) signal = 'Buy Bias';
  if (score <= 38) signal = 'Bearish Bias';

  const company = profile.name || symbol;
  const sector = profile.finnhubIndustry || 'its industry';
  const sellTrigger = price ? `$${(price * 0.96).toFixed(2)}` : '--';

  const summary = `${company} is being marked as ${signal} right now because the live price action is ${changePercent >= 0 ? 'holding above' : 'trading below'} the prior close, the opening gap is ${gap >= 0 ? 'supportive' : 'weak'}, and the stock is sitting ${intradayRange > 60 ? 'near the stronger end of today\'s range' : intradayRange < 40 ? 'closer to the weaker end of today\'s range' : 'around the middle of today\'s range'}. That mix gives it a score of ${score}, which is why it lands ${score >= 68 ? 'in buy territory' : score <= 38 ? 'in bearish territory' : 'in wait-and-see territory'} instead of being pushed as a fake slam dunk.`;
  const bullCase = `The bullish case for ${company} is that buyers are still defending the tape well enough to keep the stock competitive versus the previous close. If follow-through keeps showing up and the price continues to hold firm relative to the day range, this can stay constructive, especially if ${sector} names remain strong overall.`;
  const bearCase = `The bearish case is that this read is still based on live session behavior, not a guaranteed trend reversal. If momentum fades, if the stock loses the current intraday position, or if broad market pressure hits growth names, this setup can cool off fast and the score can drop quickly.`;
  const risk = `Main risk: this is a rule-based live read, not insider info and not a promise. Fast intraday moves can flip the signal, news can hit out of nowhere, and weaker liquidity later in the day can make a setup look cleaner than it really is.`;

  return { symbol, company, price, changePercent, score, signal, bias: signal, sellTrigger, summary, bullCase, bearCase, risk };
}

module.exports = { FINNHUB, ALPHA, APCA_KEY, APCA_SECRET, APCA_BASE, WATCHLIST, getJson, getFinnhubQuote, getFinnhubProfile, buildSignal };
