// ========================================
// GameVault — メインアプリケーションロジック
// ========================================
import { GENRES } from './src/data.js';
import './style.css';

// ── State ──
const state = {
  newsData: [],
  currentGenre: 'all',
  searchQuery: '',
  showFavoritesOnly: false,
  favorites: JSON.parse(localStorage.getItem('gamevault_favorites') || '[]'),
};

// ── DOM References ──
const dom = {
  statsBar: document.getElementById('stats-bar'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  filterTabs: document.getElementById('filter-tabs'),
  favToggle: document.getElementById('fav-toggle'),
  resultsInfo: document.getElementById('results-info'),
  cardGrid: document.getElementById('card-grid'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalContainer: document.getElementById('modal-container'),
  modalClose: document.getElementById('modal-close'),
  modalContent: document.getElementById('modal-content'),
  controlsSection: document.getElementById('controls-section'),
  refreshBtn: document.getElementById('refresh-btn'),
};

// ── Helpers ──
function saveFavorites() {
  localStorage.setItem('gamevault_favorites', JSON.stringify(state.favorites));
}

function cleanupFavorites() {
  if (state.newsData.length === 0) return;
  const validIds = new Set(state.newsData.map(g => g.id));
  const beforeCount = state.favorites.length;
  state.favorites = state.favorites.filter(id => validIds.has(id));
  if (state.favorites.length !== beforeCount) {
    saveFavorites();
  }
}

function isFavorite(id) {
  return state.favorites.includes(id);
}

function toggleFavorite(id, event) {
  if (event) {
    event.stopPropagation();
  }
  if (isFavorite(id)) {
    state.favorites = state.favorites.filter(f => f !== id);
  } else {
    state.favorites.push(id);
  }
  saveFavorites();
  renderCards();
  updateFavToggleState();
  renderStats();
}

function getGenreIcon(genre) {
  const g = GENRES.find(g => g.id === genre);
  return g ? g.icon : '🎯';
}

// ── Filter Logic ──
function getFilteredGames() {
  let games = [...state.newsData];

  // Genre filter
  if (state.currentGenre !== 'all') {
    games = games.filter(g => g.genre === state.currentGenre);
  }

  // Favorites filter
  if (state.showFavoritesOnly) {
    games = games.filter(g => isFavorite(g.id));
  }

  // Search filter
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase().trim();
    games = games.filter(g => {
      return (
        g.title.toLowerCase().includes(query) ||
        g.subtitle.toLowerCase().includes(query) ||
        g.genreLabel.toLowerCase().includes(query) ||
        g.summary.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query) ||
        g.tags.some(t => t.toLowerCase().includes(query)) ||
        (g.author && g.author.toLowerCase().includes(query)) ||
        (g.source && g.source.toLowerCase().includes(query))
      );
    });
  }

  // Sort by date (newest first)
  games.sort((a, b) => new Date(b.date.replace(/\./g, '-')) - new Date(a.date.replace(/\./g, '-')));

  return games;
}

// ── Render: Stats Bar (Mini format for slim layout) ──
function renderStats() {
  const totalGames = state.newsData.length;
  const totalFavs = state.favorites.length;

  dom.statsBar.innerHTML = `
    <span class="stat-badge">📰 ニュース <strong>${totalGames}</strong></span>
    <span class="stat-badge">♥ ブックマーク <strong>${totalFavs}</strong></span>
  `;
}

// ── Render: Filter Tabs ──
function renderFilterTabs() {
  dom.filterTabs.innerHTML = GENRES.map(genre => {
    const isActive = state.currentGenre === genre.id;
    return `
      <button
        class="filter-tab${isActive ? ' active' : ''}"
        data-genre="${genre.id}"
        role="tab"
        aria-selected="${isActive}"
      >
        <span>${genre.icon}</span>
        <span>${genre.label}</span>
      </button>
    `;
  }).join('');
}

// ── Render: Card Image ──
function renderCardImage(game) {
  const genreIcons = {
    boardgame: '🃏',
    trpg: '🎲',
    murder_mystery: '🔍',
    escape_game: '🔐',
  };

  return `
    <div class="card-image-wrapper">
      <div class="card-image-fallback ${game.genre}">
        <span style="position:relative;z-index:1">${genreIcons[game.genre] || '🎮'}</span>
      </div>
      <div class="card-image-overlay"></div>
      <span class="card-genre-badge" data-genre="${game.genre}">${getGenreIcon(game.genre)} ${game.genreLabel}</span>
      <button class="card-fav-btn ${isFavorite(game.id) ? 'favorited' : ''}" data-fav-id="${game.id}" aria-label="ブックマーク切替">
        ${isFavorite(game.id) ? '♥' : '♡'}
      </button>
    </div>
  `;
}

// ── Render: Cards ──
function renderCards() {
  const filtered = getFilteredGames();

  // Results info
  dom.resultsInfo.innerHTML = `
    新着ニュース <span class="results-count">${filtered.length}</span> 件表示中
  `;

  if (filtered.length === 0) {
    dom.cardGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📰</div>
        <div class="no-results-title">該当するニュースがありません</div>
        <div class="no-results-text">キーワードやフィルターを変更してお試しください。</div>
      </div>
    `;
    return;
  }

  dom.cardGrid.innerHTML = filtered.map((game, idx) => `
    <article
      class="game-card"
      data-genre="${game.genre}"
      data-game-id="${game.id}"
      id="card-${game.id}"
      style="animation-delay: ${idx * 0.06}s"
    >
      <div class="card-body">
        <div class="list-header-row">
          <div class="list-meta-group">
            <span class="card-genre-badge" data-genre="${game.genre}">${getGenreIcon(game.genre)} ${game.genreLabel}</span>
            <span class="card-meta-item"><span class="card-meta-icon">📅</span>${game.date} &nbsp;|&nbsp; <span class="card-meta-icon">📰</span>${game.source}</span>
          </div>
          <button class="card-fav-btn ${isFavorite(game.id) ? 'favorited' : ''}" data-fav-id="${game.id}" aria-label="ブックマーク切替">
            ${isFavorite(game.id) ? '♥' : '♡'}
          </button>
        </div>
        <h2 class="card-title">${game.title}</h2>
        <div class="list-footer-row">
          <div class="card-tags">
            ${game.tags.slice(0, 4).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
          </div>
          <a href="${game.sourceUrl}" target="_blank" rel="noopener noreferrer" class="card-readmore">
            🔎 読む <span class="arrow">→</span>
          </a>
        </div>
      </div>
    </article>
  `).join('');

  // Re-attach card click listeners
  attachCardListeners();
  renderStats();
}

// ── Render: Modal ──
function openModal(gameId) {
  const game = state.newsData.find(g => g.id === gameId);
  if (!game) return;

  // Modal image header (Unified to Premium Illustration type)
  const genreIcons = {
    boardgame: '🃏',
    trpg: '🎲',
    murder_mystery: '🔍',
    escape_game: '🔐',
  };
  const activeGenreColor = game.genre === 'murder_mystery' ? 'murder' : game.genre === 'escape_game' ? 'escape' : game.genre;

  dom.modalContent.innerHTML = `
    <div class="modal-body" data-genre="${game.genre}">
      <span class="modal-genre-badge ${game.genre}">
        ${getGenreIcon(game.genre)} ${game.genreLabel}
      </span>
      <h2 class="modal-title">${game.title}</h2>


      <!-- Description -->
      <div class="modal-section">
        <h3 class="modal-section-title">📰 ニュース詳細</h3>
        <div class="modal-description" style="word-break: break-word;">${game.description}</div>
      </div>

      <!-- Tags -->
      <div class="modal-section">
        <h3 class="modal-section-title">🏷️ タグ</h3>
        <div class="modal-tags">
          ${game.tags.map(tag => `<span class="modal-tag">${tag}</span>`).join('')}
        </div>
      </div>

      <!-- Info Grid (Moved here) -->
      <div class="modal-info-grid" style="margin-top: 1.5rem;">
        <div class="modal-info-item">
          <div class="modal-info-label">掲載日</div>
          <div class="modal-info-value">📅 ${game.date}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">情報元</div>
          <div class="modal-info-value">
            <a href="${game.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--color-${activeGenreColor}); font-weight:700; text-decoration:underline; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">
              📰 ${game.source}
            </a>
          </div>
        </div>
      </div>

    </div>
  `;

  dom.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  dom.modalContainer.scrollTop = 0;
}

function closeModal() {
  dom.modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Event Listeners ──
function attachCardListeners() {
  // Card click → open modal
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking the fav button or the readmore link
      if (e.target.closest('.card-fav-btn') || e.target.closest('.card-readmore')) return;
      const gameId = card.dataset.gameId;
      openModal(gameId);
    });
  });

  // Favorite buttons
  document.querySelectorAll('.card-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gameId = btn.dataset.favId;
      toggleFavorite(gameId, e);
    });
  });
}

function updateFavToggleState() {
  if (state.showFavoritesOnly) {
    dom.favToggle.classList.add('active');
  } else {
    dom.favToggle.classList.remove('active');
  }
}

function showToast(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `<span>🔄</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 2500);
}

async function handleRefresh() {
  if (dom.refreshBtn.classList.contains('loading')) return;

  dom.refreshBtn.classList.add('loading');
  dom.cardGrid.style.opacity = '0.3';
  dom.cardGrid.style.pointerEvents = 'none';

  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    state.newsData = data;
    cleanupFavorites();
    renderStats();
    renderCards();
    showToast(`最新ニュースを取得しました（全 ${data.length} 件）`);
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('ニュースの取得に失敗しました');
  } finally {
    dom.refreshBtn.classList.remove('loading');
    dom.cardGrid.style.opacity = '';
    dom.cardGrid.style.pointerEvents = '';
  }
}

function initEventListeners() {
  // Search input
  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    dom.searchClear.classList.toggle('visible', state.searchQuery.length > 0);
    renderCards();
  });

  // Search clear
  dom.searchClear.addEventListener('click', () => {
    state.searchQuery = '';
    dom.searchInput.value = '';
    dom.searchClear.classList.remove('visible');
    renderCards();
  });

  // Filter tabs
  dom.filterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    state.currentGenre = tab.dataset.genre;
    renderFilterTabs();
    renderCards();
  });

  // Favorites toggle
  dom.favToggle.addEventListener('click', () => {
    state.showFavoritesOnly = !state.showFavoritesOnly;
    updateFavToggleState();
    renderCards();
  });

  // Modal close
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) {
      closeModal();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Sticky controls effect (Tighter scroll triggers)
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        dom.controlsSection.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Refresh button
  dom.refreshBtn.addEventListener('click', handleRefresh);
}

// ── Initialize App ──
async function init() {
  renderStats();
  renderFilterTabs();
  
  // 初期データの取得
  try {
    const res = await fetch('/api/news');
    if (res.ok) {
      state.newsData = await res.json();
      cleanupFavorites();
    }
  } catch (err) {
    console.error('Failed to load initial news:', err);
  }
  
  renderStats();
  renderCards();
  initEventListeners();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
