const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const fmtMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

const fmtPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

const badgeClass = (bias) => {
  if (!bias) return 'warn-pill';
  if (bias.toLowerCase().includes('buy')) return 'green-pill';
  if (bias.toLowerCase().includes('sell') || bias.toLowerCase().includes('avoid')) return 'red-pill';
  return 'warn-pill';
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setBadge(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = badgeClass(text);
  el.textContent = text;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function loadOverview() {
  try {
    const data = await fetchJson('/api/market-overview');
    const picks = data.picks || [];
    const account = data.account || {};
    const positions = data.positions || [];

    setText('stat-watchlist', `${picks.length} Symbols`);
    setText('stat-account', account.status || 'Paper Ready');
    setText('stat-market', data.marketState || 'Live');

    if (picks.length) {
      const top = picks[0];
      setText('hero-symbol', top.symbol);
      setBadge('hero-bias', top.bias);
      setText('hero-summary', top.summary);
      setText('hero-score', `${top.score}/100`);
      setText('hero-price', fmtMoney(top.price));
      setText('hero-sell', fmtMoney(top.sellTrigger));
      setText('hero-why', top.reasonTags.slice(0, 2).join(' • '));
    }

    const table = document.getElementById('scanner-table');
    table.innerHTML = '';
    picks.forEach((pick) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      const changeClass = pick.changePercent > 0 ? 'up' : pick.changePercent < 0 ? 'down' : 'neutral';
      row.innerHTML = `
        <span><strong>${pick.symbol}</strong></span>
        <span>${fmtMoney(pick.price)}</span>
        <span class="${changeClass}">${fmtPct(pick.changePercent)}</span>
        <span>${pick.score}/100</span>
        <span><span class="${badgeClass(pick.bias)}">${pick.bias}</span></span>
        <span>${fmtMoney(pick.sellTrigger)}</span>
        <span><button class="quick-trade" data-symbol="${pick.symbol}">Buy 1</button></span>
      `;
      table.appendChild(row);
    });

    table.querySelectorAll('.quick-trade').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const symbol = btn.dataset.symbol;
        document.getElementById('trade-symbol').value = symbol;
        document.getElementById('trade-side').value = 'buy';
        document.getElementById('trade-qty').value = '1';
        document.getElementById('trading').scrollIntoView({ behavior: 'smooth' });
      });
    });

    setText('buying-power', fmtMoney(account.buying_power));
    setText('cash-balance', fmtMoney(account.cash));
    setText('equity-balance', fmtMoney(account.equity));
    setText('account-status', account.status || 'Unavailable');

    const positionsList = document.getElementById('positions-list');
    positionsList.innerHTML = positions.length ? '' : '<p class="muted">No open positions right now.</p>';
    positions.forEach((position) => {
      const card = document.createElement('div');
      card.className = 'position-card';
      const unrealized = Number(position.unrealized_plpc || 0) * 100;
      const pnlClass = unrealized > 0 ? 'up' : unrealized < 0 ? 'down' : 'neutral';
      card.innerHTML = `
        <h3>${position.symbol}</h3>
        <div class="position-meta">
          <div><span>Qty</span><strong>${position.qty}</strong></div>
          <div><span>Market Value</span><strong>${fmtMoney(position.market_value)}</strong></div>
          <div><span>Avg Entry</span><strong>${fmtMoney(position.avg_entry_price)}</strong></div>
          <div><span class="${pnlClass}">Unrealized</span><strong class="${pnlClass}">${fmtPct(unrealized)}</strong></div>
        </div>
      `;
      positionsList.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    setText('hero-symbol', 'Error');
    setText('hero-summary', error.message);
    const table = document.getElementById('scanner-table');
    table.innerHTML = '<div class="table-row"><span>Could not load scanner.</span><span></span><span></span><span></span><span></span><span></span><span></span></div>';
  }
}

async function loadNews() {
  try {
    const data = await fetchJson('/api/news');
    const news = data.items || [];
    const newsGrid = document.getElementById('news-grid');
    newsGrid.innerHTML = '';
    news.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'news-card reveal visible';
      card.innerHTML = `
        <span class="news-tag">${item.source || 'Market'}</span>
        <h3>${item.title}</h3>
        <p>${item.summary || 'No summary available.'}</p>
        ${item.url ? `<a class="inline-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open story</a>` : ''}
      `;
      newsGrid.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    document.getElementById('news-grid').innerHTML = '<article class="news-card"><h3>News failed to load</h3><p>Check the serverless news route or API key.</p></article>';
  }
}

async function runTicker(symbol) {
  const status = document.getElementById('ticker-status');
  status.textContent = `Loading ${symbol}...`;
  try {
    const data = await fetchJson(`/api/ticker?symbol=${encodeURIComponent(symbol)}`);
    setText('ticker-symbol', data.symbol);
    setBadge('ticker-bias-badge', data.bias);
    setText('ticker-price', fmtMoney(data.price));
    setText('ticker-change', fmtPct(data.changePercent));
    setText('ticker-score', `${data.score}/100`);
    setText('ticker-stop', fmtMoney(data.sellTrigger));
    setText('bull-case', data.bullCase);
    setText('bear-case', data.bearCase);
    setText('signal-reasons', data.reasonTags.join(' • '));
    document.getElementById('trade-symbol').value = data.symbol;
    status.textContent = `${data.symbol} loaded.`;
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
}

document.getElementById('ticker-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const symbol = document.getElementById('ticker-input').value.trim().toUpperCase();
  if (!symbol) return;
  runTicker(symbol);
});

document.getElementById('trade-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const tradeStatus = document.getElementById('trade-status');
  const symbol = document.getElementById('trade-symbol').value.trim().toUpperCase();
  const qty = document.getElementById('trade-qty').value.trim();
  const side = document.getElementById('trade-side').value;
  const type = document.getElementById('trade-type').value;
  const limitPrice = document.getElementById('trade-limit').value.trim();

  if (!symbol || !qty) {
    tradeStatus.textContent = 'Enter a symbol and quantity first.';
    return;
  }

  tradeStatus.textContent = `Sending ${side} order for ${symbol}...`;

  try {
    const payload = { symbol, qty, side, type };
    if (type === 'limit') {
      if (!limitPrice) throw new Error('Add a limit price for limit orders.');
      payload.limit_price = limitPrice;
    }

    const result = await fetchJson('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    tradeStatus.textContent = `Order sent: ${result.side} ${result.qty} ${result.symbol} (${result.type})`;
    loadOverview();
  } catch (error) {
    console.error(error);
    tradeStatus.textContent = error.message;
  }
});

loadOverview();
loadNews();
runTicker('NVDA');
