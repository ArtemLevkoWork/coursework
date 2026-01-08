document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('findToursButton');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            const resp = await fetch('/api/check-auth', {
                method: 'GET',
                credentials: 'include'
            });

            if (resp.ok) {
                window.location.href = 'findTours.html';
                return;
            }

            alert('You are not registered or not logged into the system. Please, log in or register.');
        } catch (err) {
            console.error('Auth check failed:', err);
            alert('Failed to check authorization. Try again later.');
        }
    });
});



document.addEventListener('DOMContentLoaded', function () {
    const findToursButton = document.getElementById('logInButton');
    if (findToursButton) {
        findToursButton.addEventListener('click', function () {
            window.location.href = 'login.html';
        });
    }
});