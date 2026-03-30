const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const defaultWatchlist = ['NVDA', 'AAPL', 'AMD', 'TSLA', 'MSFT', 'META'];

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

function signed(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function signedPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function getBiasClass(percent) {
  if (percent > 1) return 'green-pill';
  if (percent < -1) return 'red-pill';
  return 'neutral-pill';
}

function getBiasLabel(percent) {
  if (percent > 2) return 'Strong Bullish';
  if (percent > 0.3) return 'Bullish Bias';
  if (percent < -2) return 'Strong Bearish';
  if (percent < -0.3) return 'Bearish Bias';
  return 'Neutral';
}

function aiRead(item) {
  const pct = Number(item.percentChange || 0);
  if (pct > 2.5) return 'Momentum building with strong upside pressure';
  if (pct > 0.5) return 'Buyers have a mild edge so far';
  if (pct < -2.5) return 'Heavy selling pressure and risk-on downside';
  if (pct < -0.5) return 'Weak intraday tone with caution signs';
  return 'Sideways flow with no strong edge yet';
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function loadOverview() {
  try {
    const data = await fetchJson(`/api/market-overview?symbols=${defaultWatchlist.join(',')}`);
    const rowsWrap = document.getElementById('scanner-rows');
    const list = Array.isArray(data.watchlist) ? data.watchlist : [];

    if (!list.length) {
      rowsWrap.innerHTML = `
        <div class="table-row">
          <span>--</span>
          <span>--</span>
          <span>--</span>
          <span>No live data returned</span>
        </div>
      `;
      return;
    }

    rowsWrap.innerHTML = list.map((item) => `
      <div class="table-row">
        <span><strong>${item.symbol}</strong></span>
        <span>${money(item.price)}</span>
        <span class="${Number(item.percentChange) >= 0 ? 'up' : 'down'}">${signedPercent(item.percentChange)}</span>
        <span>${aiRead(item)}</span>
      </div>
    `).join('');

    const top = data.topMover || list[0];
    const marketStatus = data.marketOpen ? 'Open' : 'Closed';

    document.getElementById('hero-market-status').textContent = marketStatus;
    document.getElementById('hero-top-symbol').textContent = top.symbol || '--';
    document.getElementById('hero-top-move').textContent = signedPercent(top.percentChange);

    document.getElementById('panel-symbol').textContent = top.symbol || '--';
    document.getElementById('panel-price').textContent = money(top.price);
    document.getElementById('panel-change').textContent = signedPercent(top.percentChange);
    document.getElementById('panel-signal').textContent = getBiasLabel(Number(top.percentChange || 0));
    document.getElementById('panel-watch').textContent = Number(top.percentChange || 0) >= 0 ? 'Breakout + News' : 'Support + Reversal';

    const biasEl = document.getElementById('panel-bias');
    biasEl.className = getBiasClass(Number(top.percentChange || 0));
    biasEl.textContent = getBiasLabel(Number(top.percentChange || 0));

    document.getElementById('panel-summary').textContent =
      `${top.symbol} is ${Number(top.percentChange || 0) >= 0 ? 'pushing higher' : 'trading lower'} today at ${money(top.price)} with a ${signedPercent(top.percentChange)} move. AI-style read: ${aiRead(top)}.`;
  } catch (error) {
    document.getElementById('hero-market-status').textContent = 'Offline';
    document.getElementById('panel-summary').textContent = 'Backend could not load live market data. Check your Vercel environment variables and redeploy.';
    document.getElementById('scanner-rows').innerHTML = `
      <div class="table-row">
        <span>Error</span>
        <span>--</span>
        <span>--</span>
        <span>${error.message}</span>
      </div>
    `;
  }
}

async function loadNews() {
  try {
    const data = await fetchJson('/api/news');
    const grid = document.getElementById('news-grid');
    const articles = Array.isArray(data.articles) ? data.articles.slice(0, 3) : [];

    if (!articles.length) {
      grid.innerHTML = `
        <article class="news-card reveal visible">
          <span class="news-tag">News</span>
          <h3>No headlines returned</h3>
          <p>Check the backend connection or try redeploying after adding your environment variables.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = articles.map((article) => `
      <article class="news-card reveal visible">
        <span class="news-tag">${article.source || 'Market'}</span>
        <h3>${article.headline || 'Headline unavailable'}</h3>
        <p>${article.summary || 'No summary available.'}</p>
      </article>
    `).join('');
  } catch (error) {
    document.getElementById('news-grid').innerHTML = `
      <article class="news-card reveal visible">
        <span class="news-tag">Error</span>
        <h3>Could not load headlines</h3>
        <p>${error.message}</p>
      </article>
    `;
  }
}

async function searchTicker() {
  const input = document.getElementById('ticker-input');
  const symbol = input.value.trim().toUpperCase();
  const errorEl = document.getElementById('ticker-error');
  const resultEl = document.getElementById('ticker-result');

  errorEl.classList.add('hidden');
  resultEl.classList.add('hidden');

  if (!symbol) {
    errorEl.textContent = 'Enter a ticker first.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const data = await fetchJson(`/api/ticker?symbol=${encodeURIComponent(symbol)}`);
    const quote = data.quote;

    document.getElementById('ticker-symbol').textContent = quote.symbol;
    document.getElementById('ticker-price').textContent = money(quote.price);
    document.getElementById('ticker-change').textContent = signed(quote.change);
    document.getElementById('ticker-percent').textContent = signedPercent(quote.percentChange);
    document.getElementById('ticker-prev-close').textContent = money(quote.previousClose);

    const biasEl = document.getElementById('ticker-bias');
    biasEl.className = getBiasClass(Number(quote.percentChange || 0));
    biasEl.textContent = getBiasLabel(Number(quote.percentChange || 0));

    document.getElementById('ticker-summary').textContent =
      `${quote.symbol} is trading at ${money(quote.price)} today, with a move of ${signed(quote.change)} (${signedPercent(quote.percentChange)}). AI-style read: ${aiRead(quote)}. Previous close was ${money(quote.previousClose)}.`;

    resultEl.classList.remove('hidden');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
}

document.getElementById('ticker-button').addEventListener('click', searchTicker);
document.getElementById('ticker-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchTicker();
});

loadOverview();
loadNews();
