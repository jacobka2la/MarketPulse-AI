const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const page = document.body.dataset.page;
const fmtMoney = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) : '--';
const fmtPct = (value) => Number.isFinite(Number(value)) ? `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%` : '--';
const badgeClass = (bias) => !bias ? 'warn-pill' : bias.toLowerCase().includes('bullish buy') ? 'green-pill' : bias.toLowerCase().includes('bearish') ? 'red-pill' : 'warn-pill';

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
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

function renderReasons(tags = []) {
  return tags.map((tag) => `<span class="small-pill">${tag}</span>`).join('');
}

function renderScannerCard(pick) {
  return `
    <article class="scanner-card reveal visible">
      <div class="scanner-card-top">
        <div>
          <p class="eyebrow left small-gap">${pick.name}</p>
          <h3>${pick.symbol}</h3>
        </div>
        <div class="${badgeClass(pick.bias)}">${pick.bias}</div>
      </div>
      <div class="scanner-meta">
        <div class="meta-box"><span>Price</span><strong>${fmtMoney(pick.price)}</strong></div>
        <div class="meta-box"><span>Daily Move</span><strong class="${pick.changePercent > 0 ? 'up' : pick.changePercent < 0 ? 'down' : 'neutral'}">${fmtPct(pick.changePercent)}</strong></div>
        <div class="meta-box"><span>Score</span><strong>${pick.score}/100</strong></div>
        <div class="meta-box"><span>Sell Trigger</span><strong>${fmtMoney(pick.sellTrigger)}</strong></div>
      </div>
      <p>${pick.summary}</p>
      <div class="analysis-grid blocks-2 mt-20">
        <div class="analysis-block"><h3>Bull case</h3><p>${pick.bullCase}</p></div>
        <div class="analysis-block"><h3>Bear case</h3><p>${pick.bearCase}</p></div>
        <div class="analysis-block wide"><h3>Trading plan</h3><p>${pick.tradingPlan}</p></div>
      </div>
      <div class="reason-list">${renderReasons(pick.reasonTags)}</div>
    </article>
  `;
}

async function loadHome() {
  const data = await fetchJson('/api/scanner');
  const top = (data.picks || [])[0];
  if (!top) return;
  setText('hero-symbol', top.symbol);
  setBadge('hero-bias', top.bias);
  setText('hero-summary', top.summary);
  setText('hero-score', `${top.score}/100`);
  setText('hero-price', fmtMoney(top.price));
  setText('hero-sell', fmtMoney(top.sellTrigger));
  setText('hero-why', top.reasonTags.slice(0, 2).join(' • '));
}

async function loadScanner() {
  const holder = document.getElementById('scanner-cards');
  if (!holder) return;
  holder.innerHTML = '<div class="status-box">Loading scanner...</div>';
  const data = await fetchJson('/api/scanner');
  holder.innerHTML = (data.picks || []).map(renderScannerCard).join('');
}

async function loadNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="status-box">Loading news...</div>';
  const data = await fetchJson('/api/news');
  grid.innerHTML = (data.items || []).map((item) => `
    <article class="news-card reveal visible">
      <span class="news-tag">${item.source || 'Market'}</span>
      <h3>${item.title}</h3>
      <p>${item.summary || 'No summary available.'}</p>
      ${item.url ? `<a class="inline-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open story</a>` : ''}
    </article>
  `).join('');
}

async function runTicker(symbol) {
  setText('ticker-status', `Loading ${symbol}...`);
  const data = await fetchJson(`/api/ticker?symbol=${encodeURIComponent(symbol)}`);
  setText('ticker-symbol', data.symbol);
  setText('ticker-name', data.name || data.symbol);
  setBadge('ticker-bias-badge', data.bias);
  setText('ticker-price', fmtMoney(data.price));
  setText('ticker-change', fmtPct(data.changePercent));
  setText('ticker-score', `${data.score}/100`);
  setText('ticker-stop', fmtMoney(data.sellTrigger));
  setText('full-summary', data.summary);
  setText('bull-case', data.bullCase);
  setText('bear-case', data.bearCase);
  setText('trading-plan', data.tradingPlan);
  setText('ticker-status', `${data.symbol} loaded.`);
  const newsHolder = document.getElementById('ticker-news');
  if (newsHolder) {
    newsHolder.innerHTML = (data.news || []).length ? data.news.map((item) => `
      <div class="news-item">
        <strong>${item.title}</strong>
        <p>${item.summary || 'No summary available.'}</p>
        ${item.url ? `<a class="inline-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open story</a>` : ''}
      </div>
    `).join('') : '<div class="news-item"><p>No recent headlines came back for this symbol.</p></div>';
  }
}

let suggestTimer;
async function loadSuggestions(query) {
  const holder = document.getElementById('suggestions');
  if (!holder) return;
  if (!query.trim()) {
    holder.innerHTML = '';
    return;
  }
  const data = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
  const results = data.results || [];
  holder.innerHTML = results.map((item) => `
    <div class="suggestion-item" data-symbol="${item.symbol}">
      <strong>${item.symbol}</strong>
      <span class="muted">${item.name}</span>
    </div>
  `).join('');
  holder.querySelectorAll('.suggestion-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.getElementById('ticker-input').value = item.dataset.symbol;
      holder.innerHTML = '';
      runTicker(item.dataset.symbol);
    });
  });
}

function initSearchPage() {
  const form = document.getElementById('ticker-form');
  const input = document.getElementById('ticker-input');
  if (!form || !input) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const symbol = input.value.trim().toUpperCase();
    if (symbol) runTicker(symbol);
  });
  input.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const value = input.value.trim();
    suggestTimer = setTimeout(() => loadSuggestions(value), 180);
  });
  runTicker('NVDA');
}

async function loadTradePage() {
  const data = await fetchJson('/api/account');
  const account = data.account || {};
  const positions = data.positions || [];
  setText('buying-power', fmtMoney(account.buying_power));
  setText('cash-balance', fmtMoney(account.cash));
  setText('equity-balance', fmtMoney(account.equity));
  setText('account-status', account.status || '--');
  const holder = document.getElementById('positions-list');
  if (holder) {
    holder.innerHTML = positions.length ? positions.map((position) => {
      const pl = Number(position.unrealized_plpc || 0) * 100;
      const cls = pl > 0 ? 'up' : pl < 0 ? 'down' : 'neutral';
      return `
        <div class="position-card">
          <h3>${position.symbol}</h3>
          <div class="position-meta">
            <div><span>Qty</span><strong>${position.qty}</strong></div>
            <div><span>Avg Entry</span><strong>${fmtMoney(position.avg_entry_price)}</strong></div>
            <div><span>Market Value</span><strong>${fmtMoney(position.market_value)}</strong></div>
            <div><span class="${cls}">Unrealized</span><strong class="${cls}">${fmtPct(pl)}</strong></div>
          </div>
        </div>
      `;
    }).join('') : '<div class="status-box">No open positions right now.</div>';
  }
}

function initTradeForm() {
  const form = document.getElementById('trade-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      symbol: document.getElementById('trade-symbol').value.trim().toUpperCase(),
      qty: document.getElementById('trade-qty').value.trim(),
      side: document.getElementById('trade-side').value,
      type: document.getElementById('trade-type').value
    };
    if (payload.type === 'limit') payload.limit_price = document.getElementById('trade-limit').value.trim();
    setText('trade-status', `Sending ${payload.side} order...`);
    try {
      const result = await fetchJson('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setText('trade-status', `Order sent: ${result.side} ${result.qty} ${result.symbol}`);
      loadTradePage();
    } catch (error) {
      setText('trade-status', error.message);
    }
  });
}

(async function init() {
  try {
    if (page === 'home') await loadHome();
    if (page === 'scanner') await loadScanner();
    if (page === 'news') await loadNews();
    if (page === 'search') initSearchPage();
    if (page === 'trade') {
      await loadTradePage();
      initTradeForm();
    }
  } catch (error) {
    console.error(error);
    const status = document.querySelector('.status-box');
    if (status) status.textContent = error.message;
  }
})();
