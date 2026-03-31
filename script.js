const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const num = Number(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function setHTML(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = value;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function fetchJSON(url) {
  const res = await fetch(url);
  let data = null;

  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/* ---------------- HOME PAGE ---------------- */

async function loadHomeHeroCard() {
  const heroCard = document.querySelector("[data-home-scanner]");
  if (!heroCard) return;

  try {
    const data = await fetchJSON("/api/scanner");

    setText("[data-home-symbol]", data.symbol || "AAPL");
    setText("[data-home-status]", data.signal || "Neutral");
    setText("[data-home-score]", data.score ?? "--");
    setText("[data-home-price]", formatPrice(data.price));
    setText("[data-home-sell-trigger]", data.sellTrigger || "--");
    setText(
      "[data-home-reason]",
      data.summary ||
        data.reason ||
        "A live market setup was found based on current price action, volume behavior, momentum, and broader trend conditions."
    );
  } catch (err) {
    console.error("Home scanner load failed:", err);

    setText("[data-home-symbol]", "AAPL");
    setText("[data-home-status]", "Neutral");
    setText("[data-home-score]", "Fallback");
    setText("[data-home-price]", "--");
    setText("[data-home-sell-trigger]", "--");
    setText(
      "[data-home-reason]",
      "Live scanner data is temporarily unavailable. The site is still running, but the scanner feed did not return a usable response right now."
    );
  }
}

/* ---------------- SCANNER PAGE ---------------- */

function renderScannerCards(stocks) {
  const container = document.querySelector("[data-scanner-results]");
  if (!container) return;

  if (!stocks.length) {
    container.innerHTML = `
      <div class="glass-card scanner-empty">
        <h3>No setups right now</h3>
        <p>The scanner is live, but nothing currently meets the threshold for a strong setup.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stocks
    .map((stock) => {
      const signal = stock.signal || "Neutral";
      const badgeClass =
        signal.toLowerCase().includes("buy")
          ? "up"
          : signal.toLowerCase().includes("bear")
          ? "down"
          : "";

      return `
        <article class="glass-card stock-card">
          <div class="stock-card-top">
            <div>
              <p class="muted">Ticker</p>
              <h3>${stock.symbol || "--"}</h3>
            </div>
            <div class="green-pill ${badgeClass}">${signal}</div>
          </div>

          <div class="stock-meta-grid">
            <div class="mini-card">
              <span>Price</span>
              <strong>${formatPrice(stock.price)}</strong>
            </div>
            <div class="mini-card">
              <span>Change</span>
              <strong>${formatPercent(stock.changePercent)}</strong>
            </div>
            <div class="mini-card">
              <span>Score</span>
              <strong>${stock.score ?? "--"}</strong>
            </div>
            <div class="mini-card">
              <span>Sell Trigger</span>
              <strong>${stock.sellTrigger || "--"}</strong>
            </div>
          </div>

          <div class="stock-writeup">
            <h4>Why it looks this way</h4>
            <p>${stock.summary || "No descriptive summary returned."}</p>

            ${
              stock.bullCase
                ? `<h4>Bull case</h4><p>${stock.bullCase}</p>`
                : ""
            }

            ${
              stock.bearCase
                ? `<h4>Bear case</h4><p>${stock.bearCase}</p>`
                : ""
            }

            ${
              stock.risk
                ? `<h4>Risk</h4><p>${stock.risk}</p>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadScannerPage() {
  const container = document.querySelector("[data-scanner-results]");
  if (!container) return;

  container.innerHTML = `
    <div class="glass-card scanner-empty">
      <h3>Loading scanner...</h3>
      <p>Pulling real market data and ranking current setups.</p>
    </div>
  `;

  try {
    const data = await fetchJSON("/api/scanner");
    const stocks = safeArray(data.stocks || data.results || data);

    renderScannerCards(stocks);
  } catch (err) {
    console.error("Scanner page failed:", err);
    container.innerHTML = `
      <div class="glass-card scanner-empty">
        <h3>Scanner unavailable</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

/* ---------------- SEARCH PAGE ---------------- */

function renderSuggestions(items) {
  const list = document.querySelector("[data-search-suggestions]");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = "";
    list.style.display = "none";
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
        <button type="button" class="suggestion-item" data-symbol="${item.symbol}">
          <strong>${item.symbol}</strong>
          <span>${item.name || ""}</span>
        </button>
      `
    )
    .join("");

  list.style.display = "block";
}

function renderSearchResult(data) {
  const container = document.querySelector("[data-search-result]");
  if (!container) return;

  container.innerHTML = `
    <article class="glass-card stock-card">
      <div class="stock-card-top">
        <div>
          <p class="muted">Ticker Search</p>
          <h3>${data.symbol || "--"}</h3>
        </div>
        <div class="green-pill">${data.signal || "Neutral"}</div>
      </div>

      <div class="stock-meta-grid">
        <div class="mini-card">
          <span>Price</span>
          <strong>${formatPrice(data.price)}</strong>
        </div>
        <div class="mini-card">
          <span>Change</span>
          <strong>${formatPercent(data.changePercent)}</strong>
        </div>
        <div class="mini-card">
          <span>Sell Trigger</span>
          <strong>${data.sellTrigger || "--"}</strong>
        </div>
        <div class="mini-card">
          <span>Bias</span>
          <strong>${data.bias || data.signal || "--"}</strong>
        </div>
      </div>

      <div class="stock-writeup">
        <h4>Full read</h4>
        <p>${data.summary || "No summary returned."}</p>

        ${data.bullCase ? `<h4>Bull case</h4><p>${data.bullCase}</p>` : ""}
        ${data.bearCase ? `<h4>Bear case</h4><p>${data.bearCase}</p>` : ""}
        ${data.risk ? `<h4>Risk</h4><p>${data.risk}</p>` : ""}
      </div>
    </article>
  `;
}

async function runTickerSearch(symbol) {
  const container = document.querySelector("[data-search-result]");
  const input = document.querySelector("[data-stock-input]");
  const suggestions = document.querySelector("[data-search-suggestions]");

  if (!symbol) return;

  if (input) input.value = symbol.toUpperCase();
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }

  if (container) {
    container.innerHTML = `
      <div class="glass-card scanner-empty">
        <h3>Loading ${symbol.toUpperCase()}...</h3>
        <p>Pulling price action, trend, and signal details.</p>
      </div>
    `;
  }

  try {
    const data = await fetchJSON(`/api/ticker?symbol=${encodeURIComponent(symbol)}`);
    renderSearchResult(data);
  } catch (err) {
    console.error("Ticker search failed:", err);
    if (container) {
      container.innerHTML = `
        <div class="glass-card scanner-empty">
          <h3>Search failed</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
}

async function fetchSuggestions(query) {
  if (!query || query.trim().length < 1) {
    renderSuggestions([]);
    return;
  }

  try {
    const data = await fetchJSON(`/api/search?q=${encodeURIComponent(query.trim())}`);
    renderSuggestions(safeArray(data.results || data));
  } catch (err) {
    console.error("Suggestion fetch failed:", err);
    renderSuggestions([]);
  }
}

function initSearchPage() {
  const input = document.querySelector("[data-stock-input]");
  const form = document.querySelector("[data-search-form]");
  const list = document.querySelector("[data-search-suggestions]");

  if (!input || !form) return;

  const debouncedSuggest = debounce((value) => {
    fetchSuggestions(value);
  }, 200);

  input.addEventListener("input", (e) => {
    debouncedSuggest(e.target.value);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runTickerSearch(input.value.trim());
  });

  if (list) {
    list.addEventListener("click", (e) => {
      const button = e.target.closest("[data-symbol]");
      if (!button) return;
      runTickerSearch(button.dataset.symbol);
    });
  }
}

/* ---------------- NEWS PAGE ---------------- */

function renderNews(items) {
  const container = document.querySelector("[data-news-results]");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="glass-card scanner-empty">
        <h3>No news found</h3>
        <p>The news endpoint returned no stories right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="news-card">
          <span class="news-tag">${item.source || "Market"}</span>
          <h3>${item.title || "Untitled story"}</h3>
          <p>${item.summary || item.description || "No summary available."}</p>
          ${
            item.url
              ? `<a class="button button-secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Open Story</a>`
              : ""
          }
        </article>
      `
    )
    .join("");
}

async function loadNewsPage() {
  const container = document.querySelector("[data-news-results]");
  if (!container) return;

  container.innerHTML = `
    <div class="glass-card scanner-empty">
      <h3>Loading market news...</h3>
      <p>Pulling the latest headlines and summaries.</p>
    </div>
  `;

  try {
    const data = await fetchJSON("/api/news");
    renderNews(safeArray(data.news || data.results || data));
  } catch (err) {
    console.error("News load failed:", err);
    container.innerHTML = `
      <div class="glass-card scanner-empty">
        <h3>News unavailable</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

/* ---------------- TRADE PAGE ---------------- */

function renderAccount(data) {
  setText("[data-account-equity]", formatPrice(data.equity));
  setText("[data-account-cash]", formatPrice(data.cash));
  setText("[data-account-buying-power]", formatPrice(data.buying_power));
  setText("[data-account-status]", data.status || "--");
}

async function loadTradePage() {
  const tradePanel = document.querySelector("[data-trade-page]");
  if (!tradePanel) return;

  try {
    const account = await fetchJSON("/api/account");
    renderAccount(account);
  } catch (err) {
    console.error("Trade page account load failed:", err);
    setText("[data-account-status]", "Unavailable");
  }

  const form = document.querySelector("[data-trade-form]");
  const message = document.querySelector("[data-trade-message]");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const symbol = form.querySelector('[name="symbol"]')?.value?.trim()?.toUpperCase();
    const qty = form.querySelector('[name="qty"]')?.value?.trim();
    const side = form.querySelector('[name="side"]')?.value;

    if (!symbol || !qty || !side) {
      if (message) message.textContent = "Fill out symbol, quantity, and side.";
      return;
    }

    if (message) message.textContent = "Sending paper trade...";

    try {
      const data = await fetchJSON("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, qty, side })
      });
      if (message) {
        message.textContent = `Order submitted: ${data.symbol || symbol} ${data.side || side} x ${data.qty || qty}`;
      }
    } catch (err) {
      console.error("Order failed:", err);
      if (message) message.textContent = `Order failed: ${err.message}`;
    }
  });
}

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  loadHomeHeroCard();
  loadScannerPage();
  initSearchPage();
  loadNewsPage();
  loadTradePage();
});
