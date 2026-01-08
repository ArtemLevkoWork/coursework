document.addEventListener('DOMContentLoaded', () => {
    const btnManageReq = document.getElementById('manageReqButton');
    const btnManageTours = document.getElementById('manageToursButton');
    const requestsRoot = document.querySelector('.manageRequestsModal');
    const toursRoot = document.querySelector('.manageToursModal');

    if (!btnManageReq || !btnManageTours || !requestsRoot || !toursRoot) {
        console.error('admin.js: required elements not found', { btnManageReq, btnManageTours, requestsRoot, toursRoot });
        return;
    }

    const jsonHeaders = { 'Content-Type': 'application/json' };

    async function apiGet(url) {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
        return r.json();
    }
    async function apiPatch(url, body) {
        const r = await fetch(url, { method: 'PATCH', credentials: 'include', headers: jsonHeaders, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
        return r.json();
    }
    async function apiPost(url, body) {
        const r = await fetch(url, { method: 'POST', credentials: 'include', headers: jsonHeaders, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
        return r.json();
    }
    async function apiDelete(url) {
        const r = await fetch(url, { method: 'DELETE', credentials: 'include' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
        return r.text();
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function fmtDate(d) {
        try { return new Date(d).toLocaleString(); } catch (e) { return d || ''; }
    }
    function formatDateForInput(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    btnManageReq.addEventListener('click', async () => {
        requestsRoot.innerHTML = `<div class="admin-panel"><h3>Загрузка заявок�</h3></div>`;
        try {
            const requests = await apiGet('/api/admin/requests');
            renderRequests(requestsRoot, requests);
        } catch (err) {
            console.error('Failed to load requests', err);
            requestsRoot.innerHTML = `<div class="admin-panel error">Failed to load requests: ${escapeHtml(err.message)}</div>`;
        }
    });

    function renderRequests(root, requests) {
        root.innerHTML = '';
        const panel = document.createElement('div');
        panel.className = 'admin-panel admin-modal';

        const header = document.createElement('div');
        header.className = 'admin-header';
        const title = document.createElement('h3');
        title.textContent = `Заявок (${(requests && requests.length) || 0})`;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Закрыть панель');
        closeBtn.addEventListener('click', () => { root.innerHTML = ''; });
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        if (!Array.isArray(requests) || requests.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'Нет заявок';
            panel.appendChild(empty);
            root.appendChild(panel);
            return;
        }

        const list = document.createElement('div');
        list.className = 'requests-list';

        requests.forEach(r => {
            const item = document.createElement('div');
            item.className = 'request-item';
            item.dataset.requestId = r.id;

            const status = String(r.status || r.toursrequestsStatus || '').toLowerCase();

            item.innerHTML = `
        <div class="request-info">
          <div><strong>#${escapeHtml(r.id)}</strong> � тур: ${escapeHtml(r.tourName || r.idtours || '�')}</div>
          <div>клиент: ${escapeHtml(r.clientName || r.idclients || '�')}</div>
          <div class="small">создано: ${escapeHtml(fmtDate(r.createdAt || r.toursrequestsCreatedAt))}</div>
          <div class="small">статус: <span class="status-text">${escapeHtml(status)}</span></div>
        </div>
      `;

            const actions = document.createElement('div');
            actions.className = 'request-actions';

            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'accept-btn';
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'reject-btn';

            if (status === 'new') {
                acceptBtn.textContent = 'Принять на рассмотрение';
                rejectBtn.textContent = 'Отклонить на рассмотрение';
            } else if (status === 'in_review' || status === 'processed') {
                acceptBtn.textContent = 'Принять заявку';
                rejectBtn.textContent = 'Отклонить заявку';
            } else {
                acceptBtn.textContent = 'Принять';
                rejectBtn.textContent = 'Отклонить';
            }

            if (status === 'accepted' || status === 'rejected') {
                acceptBtn.disabled = true;
                rejectBtn.disabled = true;
            }

            actions.appendChild(acceptBtn);
            actions.appendChild(rejectBtn);
            item.appendChild(actions);
            list.appendChild(item);

            acceptBtn.addEventListener('click', async () => {
                await performRequestTransition(requestsRoot, r.id, 'accept');
            });
            rejectBtn.addEventListener('click', async () => {
                await performRequestTransition(requestsRoot, r.id, 'reject');
            });
        });

        panel.appendChild(list);
        root.appendChild(panel);
    }

    async function performRequestTransition(root, requestId, action) {
        try {
            const single = await apiGet(`/api/admin/requests/${requestId}`);
            const current = String(single.toursrequestsStatus || single.status || '').toLowerCase();

            if (current === 'new') {
                await apiPatch(`/api/admin/requests/${requestId}`, { status: 'in_review' });
                const fresh = await apiGet('/api/admin/requests');
                renderRequests(root, fresh);
                return;
            }

            if (current === 'in_review' || current === 'processed') {
                const final = action === 'accept' ? 'accepted' : 'rejected';
                await apiPatch(`/api/admin/requests/${requestId}`, { status: final });
                const fresh = await apiGet('/api/admin/requests');
                renderRequests(root, fresh);
                return;
            }

            if (current === 'accepted' || current === 'rejected') {
                const fresh = await apiGet('/api/admin/requests');
                renderRequests(root, fresh);
                return;
            }

            await apiPatch(`/api/admin/requests/${requestId}`, { status: 'in_review' });
            const fresh = await apiGet('/api/admin/requests');
            renderRequests(root, fresh);
        } catch (err) {
            console.error('Request action failed', err);
            alert('Действие не выполнено: ' + (err.message || 'неизвестно'));
        }
    }

    btnManageTours.addEventListener('click', async () => {
        toursRoot.innerHTML = `<div class="admin-panel"><h3>Загрузка туров�</h3></div>`;
        try {
            const tours = await apiGet('/api/tours?limit=500');
            renderTours(toursRoot, tours);
        } catch (err) {
            console.error('Failed to load tours', err);
            toursRoot.innerHTML = `<div class="admin-panel error">Failed to load tours: ${escapeHtml(err.message)}</div>`;
        }
    });

    function renderTours(root, tours) {
        root.innerHTML = '';
        const panel = document.createElement('div');
        panel.className = 'admin-panel admin-modal';

        const header = document.createElement('div');
        header.className = 'admin-header';
        const title = document.createElement('h3');
        title.textContent = `Туров (${(tours && tours.length) || 0})`;
        const createBtn = document.createElement('button');
        createBtn.className = 'create-tour-btn';
        createBtn.textContent = 'Создать новый тур';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => { root.innerHTML = ''; });

        header.appendChild(title);
        header.appendChild(createBtn);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const list = document.createElement('div');
        list.className = 'tours-admin-list';

        (tours || []).forEach(t => {
            const card = document.createElement('div');
            card.className = 'tour-admin-card';
            card.dataset.tourId = t.id;

            const cover = escapeHtml(t.coverUrl || t.toursCover || '/placeholder.jpg');
            const name = escapeHtml(t.name || t.toursName || '');
            const desc = escapeHtml(t.shortDesc || t.toursDesc || '');
            const dateVal = formatDateForInput(t.date || t.toursDate);

            card.innerHTML = `
        <img class="admin-tour-image" src="${cover}" alt="">
        <div class="admin-tour-body">
          <label>Название: <input class="edit-title" value="${name}"></label>
          <label>Описание: <input class="edit-desc" value="${desc}"></label>
          <label>Дата: <input type="date" class="edit-date" value="${dateVal}"></label>
          <label>URL обложки: <input class="edit-cover" value="${cover}"></label>
          <div class="admin-tour-actions">
            <button class="save-tour-btn">Сохранить</button>
            <button class="delete-tour-btn">Удалить</button>
          </div>
        </div>
      `;

            card.querySelector('.save-tour-btn').addEventListener('click', async () => {
                const id = card.dataset.tourId;
                const title = card.querySelector('.edit-title').value.trim();
                const description = card.querySelector('.edit-desc').value.trim();
                const date = card.querySelector('.edit-date').value;
                const coverUrl = card.querySelector('.edit-cover').value.trim();
                if (!title || !date) { alert('Название и дата обязательны'); return; }
                try {
                    await apiPatch(`/api/tours/${id}`, { toursName: title, toursDesc: description, toursDate: date, toursCover: coverUrl });
                    alert('Сохранено');
                    const fresh = await apiGet('/api/tours?limit=500');
                    renderTours(root, fresh);
                } catch (err) {
                    console.error('Save failed', err);
                    alert('Ошибка сохранения: ' + (err.message || 'неизвестна'));
                }
            });

            card.querySelector('.delete-tour-btn').addEventListener('click', async () => {
                if (!confirm('Удалить этот тур? Это действие нельзя отменить.')) return;
                const id = card.dataset.tourId;
                try {
                    await apiDelete(`/api/tours/${id}`);
                    const fresh = await apiGet('/api/tours?limit=500');
                    renderTours(root, fresh);
                } catch (err) {
                    console.error('Delete failed', err);
                    alert('Ошибка удаления: ' + (err.message || 'неизвестна'));
                }
            });

            list.appendChild(card);
        });

        panel.appendChild(list);
        root.appendChild(panel);

        createBtn.addEventListener('click', () => openCreateTourForm(panel, list));
    }

    function openCreateTourForm(panel, listContainer) {
        if (panel.querySelector('.create-tour-form')) return;
        const formWrap = document.createElement('div');
        formWrap.className = 'create-tour-form';
        formWrap.innerHTML = `
      <h4>Создать новый тур</h4>
      <label>Название: <input id="newTourTitle"></label>
      <label>Описание: <input id="newTourDesc"></label>
      <label>Дата: <input id="newTourDate" type="date"></label>
      <label>URL обложки: <input id="newTourCover"></label>
      <div style="margin-top:8px;">
        <button id="createTourSubmit">Создать</button>
        <button id="createTourCancel">Отмена</button>
      </div>
    `;
        panel.appendChild(formWrap);

        formWrap.querySelector('#createTourCancel').addEventListener('click', () => formWrap.remove());
        formWrap.querySelector('#createTourSubmit').addEventListener('click', async () => {
            const title = formWrap.querySelector('#newTourTitle').value.trim();
            const desc = formWrap.querySelector('#newTourDesc').value.trim();
            const date = formWrap.querySelector('#newTourDate').value;
            const cover = formWrap.querySelector('#newTourCover').value.trim();
            if (!title || !date) { alert('Название и дата обязательны'); return; }
            try {
                await apiPost('/api/tours', { toursName: title, toursDesc: desc, toursDate: date, toursCover: cover });
                const fresh = await apiGet('/api/tours?limit=500');
                renderTours(toursRoot, fresh);
            } catch (err) {
                console.error('Create failed', err);
                alert('Ошибка создания: ' + (err.message || 'неизвестна'));
            }
        });
    }
});
