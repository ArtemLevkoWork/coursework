document.addEventListener('DOMContentLoaded', () => {
    const containerA = document.getElementById('trendingTours'); 
    const containerB = document.getElementById('newTours');      
    const modalRoot = document.getElementById('toursModal');    
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    if (!containerA || !modalRoot) {
        console.error('findTours.js: required containers not found');
        return;
    }

    const escapeHtml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formatDate = d => { try { return new Date(d).toLocaleDateString(); } catch (e) { return d; } };

    function mapTourFromServer(t) {
        return {
            id: t.id,
            title: t.name,
            description: t.shortDesc,
            startDate: t.date,
            imageUrl: t.coverUrl,
            article: t.article,
            rating: t.rating
        };
    }

    function createCard(tour, currentSection) {
        const card = document.createElement('div');
        card.className = 'tour-card';
        card.dataset.tourId = tour.id;
        card.dataset.section = currentSection || (tour.article || '');

        card.innerHTML = `
      <img class="tour-image" src="${escapeHtml(tour.imageUrl || '/placeholder.jpg')}" alt="${escapeHtml(tour.title)}">
      <h3 class="tour-title">${escapeHtml(tour.title)}</h3>
      <div class="tour-date">Начало: ${escapeHtml(formatDate(tour.startDate))}</div>
      <p class="tour-desc">${escapeHtml(tour.description)}</p>
      <div class="tour-rating">Рейтинг: ${tour.rating != null ? Number(tour.rating).toFixed(1) : '�'}</div>
      <div class="card-actions">
        <button class="details-btn">Посмотреть детали</button>
      </div>
    `;

        card.querySelector('.details-btn').addEventListener('click', () => openModal(tour));
        return card;
    }

    function openModal(tour) {
        modalRoot.innerHTML = '';
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'tour-modal';
        modal.innerHTML = `
      <img class="modal-image" src="${escapeHtml(tour.imageUrl || '/placeholder.jpg')}" alt="${escapeHtml(tour.title)}">
      <h2>${escapeHtml(tour.title)}</h2>
      <div>Начало: ${escapeHtml(formatDate(tour.startDate))}</div>
      <p>${escapeHtml(tour.description)}</p>
      <div>Рейтинг: ${tour.rating != null ? Number(tour.rating).toFixed(1) : '�'}</div>
      <div class="modal-actions">
        <button id="leaveRequestBtn">Оставить заявку</button>
        <button id="closeTourBtn">Закрыть</button>
      </div>
      <hr>
      <div class="modal-review">
        <h4>Оставить отзыв</h4>
        <label>Рейтинг:
          <select id="reviewRating">
            <option value="5">5</option><option value="4">4</option><option value="3">3</option>
            <option value="2">2</option><option value="1">1</option>
          </select>
        </label>
        <textarea id="reviewText" rows="3" placeholder="Ваш отзыв..."></textarea>
        <div><button id="submitReviewBtn">Отправить отзыв</button></div>
      </div>
    `;
        overlay.appendChild(modal);
        modalRoot.appendChild(overlay);

        document.getElementById('closeTourBtn').addEventListener('click', () => modalRoot.innerHTML = '');

        document.getElementById('leaveRequestBtn').addEventListener('click', async () => {
            const btn = document.getElementById('leaveRequestBtn');
            if (!btn) return;

            btn.disabled = true;
            const prevText = btn.textContent;
            btn.textContent = 'Отправка...';

            try {
                const resp = await fetch(`/api/tours/${tour.id}/request`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}) 
                });

                if (resp.ok) {
                    alert('Заявка отправлена');
                    modalRoot.innerHTML = '';
                } else if (resp.status === 401) {
                    alert('Пожалуйста, войдите');
                } else {
                    const errText = await resp.text().catch(() => null);
                    alert('Ошибка заявки' + (errText ? ': ' + errText : ''));
                }
            } catch (err) {
                console.error('Request error', err);
                alert('Сетевая ошибка. Попробуйте позже.');
            } finally {
                btn.disabled = false;
                btn.textContent = prevText;
            }
        });

        document.getElementById('submitReviewBtn').addEventListener('click', async () => {
            const rating = Number(document.getElementById('reviewRating').value);
            const text = document.getElementById('reviewText').value.trim();
            if (!rating) { alert('Выберите рейтинг'); return; }
            const resp = await fetch(`/api/tours/${tour.id}/reviews`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, text })
            });
            if (resp.ok) { alert('Отзыв отправлен'); modalRoot.innerHTML = ''; loadAndRender(); }
            else if (resp.status === 401) alert('Пожалуйста, войдите'); else alert('Ошибка отзыва');
        });

        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) modalRoot.innerHTML = ''; });
    }

    const filters = {
        bySectionA: tour => (tour.article || '').toUpperCase() === 'A',
        bySectionB: tour => (tour.article || '').toUpperCase() === 'B',
        byUpcoming: tour => new Date(tour.date) >= new Date(),
    };

    let allTours = [];
    async function loadTours(q = '') {
        try {
            const url = q ? `/api/tours?q=${encodeURIComponent(q)}&limit=200` : '/api/tours?limit=200';
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Failed to load tours');
            const raw = await resp.json();
            allTours = raw.map(mapTourFromServer);
        } catch (err) {
            console.error('loadTours error', err);
            allTours = [];
        }
    }

    function renderSection(container, tours, filterFn, sectionLabel) {
        container.innerHTML = '';
        const list = tours.filter(filterFn);
        if (list.length === 0) {
            container.innerHTML = '<div class="empty">Нет туров</div>';
            return;
        }
        list.forEach(t => container.appendChild(createCard(t, sectionLabel)));
    }

    function getSectionFromArticle(articleValue) {
        if (!articleValue) return null;
        const v = String(articleValue).trim().toLowerCase();
        const aValues = new Set(['a', 'trending', 'popular', 'top']);
        const bValues = new Set(['b', 'new', 'upcoming', 'latest']);
        if (aValues.has(v)) return 'A';
        if (bValues.has(v)) return 'B';
        return null;
    }

    async function loadAndRender(q = '') {
        await loadTours(q);
        const byArticleA = [];
        const byArticleB = [];
        const unassigned = [];

        allTours.forEach(t => {
            const section = getSectionFromArticle(t.article);
            if (section === 'A') byArticleA.push(t);
            else if (section === 'B') byArticleB.push(t);
            else unassigned.push(t);
        });

        const trendingFromUnassigned = [...unassigned].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8 - byArticleA.length);
        const upcomingFromUnassigned = [...unassigned].filter(filters.byUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 12 - byArticleB.length);

        const trending = byArticleA.concat(trendingFromUnassigned).slice(0, 8);
        const upcoming = byArticleB.concat(upcomingFromUnassigned).slice(0, 12);

        containerA.innerHTML = '';
        trending.forEach(t => containerA.appendChild(createCard(t, 'A')));

        containerB.innerHTML = '';
        upcoming.forEach(t => containerB.appendChild(createCard(t, 'B')));
    }

    searchButton?.addEventListener('click', () => {
        const q = (searchInput?.value || '').trim();
        loadAndRender(q);
    });
    searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchButton.click(); } });

    loadAndRender();
});
