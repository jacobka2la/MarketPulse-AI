const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const page = document.body.dataset.page;

function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}
function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const num = Number(value);
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}
function badgeClass(signal) {
  const s = (signal || '').toLowerCase();
  if (s.includes('bear')) return 'bearish';
  if (s.includes('neutral') || s.includes('wait') || s.includes('mixed')) return 'neutral';
  return '';
}
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  return data;
}

async function loadHome() {
  const card = document.querySelector('[data-home-card]');
  if (!card) return;
  try {
    const data = await fetchJSON('/api/scanner');
    const top = (data.stocks || [])[0];
    if (!top) throw new Error('No setups returned.');
    document.querySelector('[data-home-symbol]').textContent = top.symbol;
    document.querySelector('[data-home-signal]').textContent = top.signal;
    document.querySelector('[data-home-signal]').classList.add(badgeClass(top.signal));
    document.querySelector('[data-home-summary]').textContent = top.summary;
    document.querySelector('[data-home-score]').textContent = top.score;
    document.querySelector('[data-home-price]').textContent = formatPrice(top.price);
    document.querySelector('[data-home-sell]').textContent = top.sellTrigger || '--';
    document.querySelector('[data-home-bias]').textContent = top.bias || top.signal;
  } catch (err) {
    document.querySelector('[data-home-symbol]').textContent = 'Feed Error';
    document.querySelector('[data-home-signal]').textContent = 'Unavailable';
    document.querySelector('[data-home-signal]').classList.add('neutral');
    document.querySelector('[data-home-summary]').textContent = err.message;
    document.querySelector('[data-home-score]').textContent = '--';
    document.querySelector('[data-home-price]').textContent = '--';
    document.querySelector('[data-home-sell]').textContent = '--';
    document.querySelector('[data-home-bias]').textContent = '--';
  }
}

function renderStockCard(stock) {
  return `
    <article class="stock-card">
      <div class="stock-card-top">
        <div><p class="muted">Ticker</p><h3>${stock.symbol}</h3></div>
        <div class="green-pill ${badgeClass(stock.signal)}">${stock.signal}</div>
      </div>
      <div class="stock-meta-grid">
        <div class="mini-card"><span>Price</span><strong>${formatPrice(stock.price)}</strong></div>
        <div class="mini-card"><span>Change</span><strong>${formatPercent(stock.changePercent)}</strong></div>
        <div class="mini-card"><span>Score</span><strong>${stock.score}</strong></div>
        <div class="mini-card"><span>Sell Trigger</span><strong>${stock.sellTrigger || '--'}</strong></div>
      </div>
      <div class="stock-writeup">
        <h4>Full read</h4><p>${stock.summary}</p>
        <h4>Bull case</h4><p>${stock.bullCase}</p>
        <h4>Bear case</h4><p>${stock.bearCase}</p>
        <h4>Risk</h4><p>${stock.risk}</p>
      </div>
    </article>`;
}

async function loadScanner() {
  const wrap = document.querySelector('[data-scanner-results]');
  if (!wrap) return;
  try {
    const data = await fetchJSON('/api/scanner');
    const stocks = data.stocks || [];
    if (!stocks.length) throw new Error('No setups returned.');
    wrap.innerHTML = stocks.map(renderStockCard).join('');
  } catch (err) {
    wrap.innerHTML = `<div class="scanner-empty"><h3>Scanner unavailable</h3><p>${err.message}</p></div>`;
  }
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function renderSuggestions(items) {
  const box = document.querySelector('[data-search-suggestions]');
  if (!box) return;
  if (!items.length) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.innerHTML = items.map(item => `<button type="button" class="suggestion-item" data-symbol="${item.symbol}"><strong>${item.symbol}</strong><span>${item.description || item.name || ''}</span></button>`).join('');
  box.style.display = 'block';
}

async function runSuggestions(q) {
  if (!q.trim()) return renderSuggestions([]);
  try {
    const data = await fetchJSON(`/api/search?q=${encodeURIComponent(q.trim())}`);
    renderSuggestions(data.results || []);
  } catch {
    renderSuggestions([]);
  }
}

async function runTicker(symbol) {
  const result = document.querySelector('[data-search-result]');
  const suggestions = document.querySelector('[data-search-suggestions]');
  if (!result || !symbol) return;
  result.innerHTML = `<div class="scanner-empty"><h3>Loading ${symbol.toUpperCase()}...</h3><p>Pulling the latest read.</p></div>`;
  if (suggestions) { suggestions.style.display = 'none'; suggestions.innerHTML = ''; }
  try {
    const data = await fetchJSON(`/api/ticker?symbol=${encodeURIComponent(symbol)}`);
    result.innerHTML = renderStockCard(data);
  } catch (err) {
    result.innerHTML = `<div class="scanner-empty"><h3>Search failed</h3><p>${err.message}</p></div>`;
  }
}

function initSearch() {
  const input = document.querySelector('[data-stock-input]');
  const form = document.querySelector('[data-search-form]');
  const suggestions = document.querySelector('[data-search-suggestions]');
  if (!input || !form) return;
  input.addEventListener('input', debounce((e) => runSuggestions(e.target.value)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runTicker(input.value.trim().toUpperCase());
  });
  suggestions?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-symbol]');
    if (!btn) return;
    input.value = btn.dataset.symbol;
    runTicker(btn.dataset.symbol);
  });
}

async function loadNews() {
  const wrap = document.querySelector('[data-news-results]');
  if (!wrap) return;
  try {
    const data = await fetchJSON('/api/news');
    const items = data.news || [];
    if (!items.length) throw new Error('No news returned.');
    wrap.innerHTML = items.map(item => `
      <article class="news-card">
        <span class="news-tag">${item.source || 'Market'}</span>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
        ${item.url ? `<a class="button button-secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Open Story</a>` : ''}
      </article>`).join('');
  } catch (err) {
    wrap.innerHTML = `<div class="scanner-empty"><h3>News unavailable</h3><p>${err.message}</p></div>`;
  }
}

async function loadTrade() {
  const root = document.querySelector('[data-trade-page]');
  if (!root) return;
  try {
    const account = await fetchJSON('/api/account');
    document.querySelector('[data-account-status]').textContent = account.status || '--';
    document.querySelector('[data-account-equity]').textContent = formatPrice(account.equity);
    document.querySelector('[data-account-cash]').textContent = formatPrice(account.cash);
    document.querySelector('[data-account-buying-power]').textContent = formatPrice(account.buying_power);
  } catch (err) {
    document.querySelector('[data-account-status]').textContent = 'Unavailable';
    document.querySelector('[data-trade-message]').textContent = err.message;
  }
  const form = document.querySelector('[data-trade-form]');
  const message = document.querySelector('[data-trade-message]');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    message.textContent = 'Submitting paper trade...';
    try {
      const out = await fetchJSON('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      message.textContent = `Paper order sent: ${out.side} ${out.qty} ${out.symbol}`;
    } catch (err) {
      message.textContent = err.message;
    }
  });
}

if (page === 'home') loadHome();
if (page === 'scanner') loadScanner();
if (page === 'search') initSearch();
if (page === 'news') loadNews();
if (page === 'trade') loadTrade();
