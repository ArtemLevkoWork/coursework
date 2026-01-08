document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('logInForm');
    const submitBtn = document.getElementById('logInFormButton');
    const logoutBtn = document.getElementById('logOutButton');

    if (!form) {
        console.error('login.js: form with id "logInForm" not found');
        return;
    }
    if (!submitBtn) {
        console.error('login.js: submit button with id "logInFormButton" not found');
        return;
    }
    if (!logoutBtn) {
        console.warn('login.js: logout button with id "logOutButton" not found; logout will be unavailable');
    }

    const ADMIN_DOMAIN_FALLBACK = '@voyariestuff.com';

    async function doLogin(name, email, password) {
        return fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });
    }

    async function registerClient(name, email, password) {
        return fetch('/api/register-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
    }

    async function registerAdmin(name, email, password) {
        return fetch('/api/register-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
    }

    async function doLogout() {
        try {
            const resp = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            if (!resp.ok) {
                console.warn('Logout request returned', resp.status);
            }
        } catch (err) {
            console.error('Logout request failed:', err);
        } finally {
            await refreshAuthState();
        }
    }

    async function refreshAuthState() {
        try {
            const resp = await fetch('/api/check-auth', { method: 'GET', credentials: 'include' });
            if (resp.ok) {
                form.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = '';
                return true;
            }
        } catch (err) {
            console.error('check-auth failed:', err);
        }
        form.style.display = '';
        if (logoutBtn) logoutBtn.style.display = 'none';
        return false;
    }

    refreshAuthState();

    logoutBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        await doLogout();
        alert('Вы вышли.');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (form.querySelector('#nameInput')?.value || '').trim();
        const emailRaw = (form.querySelector('#emailInput')?.value || '').trim();
        const email = emailRaw.toLowerCase();
        const password = (form.querySelector('#passwordInput')?.value || '');

        if (!name || !email || !password) {
            alert('Пожалуйста, заполните все поля: имя, электронная почта и пароль.');
            return;
        }

        submitBtn.disabled = true;
        const prevText = submitBtn.textContent;
        submitBtn.textContent = 'Загрузка...';

        try {
            let resp = await doLogin(name, email, password);

            if (resp.status === 404) {
                const json404 = await resp.json().catch(() => null);
                const missingFor = json404 && json404.missingFor;
                const isAdminEmail = missingFor === 'admin' || (!missingFor && email.endsWith(ADMIN_DOMAIN_FALLBACK));
                const want = confirm('Пользователь не найден. Хотите зарегистрироваться?');
                if (!want) {
                    return;
                }

                const regResp = isAdminEmail
                    ? await registerAdmin(name, email, password)
                    : await registerClient(name, email, password);

                if (!regResp.ok) {
                    const regJson = await regResp.json().catch(() => null);
                    alert(regJson && regJson.error ? `Ошибка регистрации: ${regJson.error}` : `Ошибка регистрации (статус ${regResp.status})`);
                    return;
                }

                alert('Регистрация успешна. Выполняется вход...');
                resp = await doLogin(name, email, password);
                if (!resp.ok) {
                    const json = await resp.json().catch(() => null);
                    alert(json && json.error ? `Ошибка входа: ${json.error}` : `Ошибка входа (статус ${resp.status})`);
                    return;
                }
            }

            if (!resp.ok) {
                const json = await resp.json().catch(() => null);
                alert(json && json.error ? json.error : `Ошибка входа (статус ${resp.status})`);
                return;
            }

            const json = await resp.json().catch(() => null);
            await refreshAuthState();
            alert('Вход выполнен успешно.');
            if (json && json.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/findTours.html';
            }
        } catch (err) {
            console.error('Login/register flow failed:', err);
            alert('Сетевая ошибка. Попробуйте позже.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = prevText;
        }
    });
});
