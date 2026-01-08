require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5500',
    credentials: true
}));

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https:;" +
        "frame-ancestors 'none';"
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    next();
});

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mydb',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_strong_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

app.post('/api/login', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

        const emailNorm = String(email).trim().toLowerCase();

        if (emailNorm.endsWith('@voyariestuff.com')) {
            const [adminsRows] = await db.query(
                'SELECT idadmins, adminsName, adminsEmail, adminsPassword FROM admins WHERE LOWER(adminsEmail) = ?',
                [emailNorm]
            );

            if (!adminsRows.length) return res.status(404).json({ error: 'User not found' });

            const admin = adminsRows[0];
            let stored = admin.adminsPassword;
            if (!stored) return res.status(401).json({ error: 'Invalid credentials' });
            if (!Buffer.isBuffer(stored)) stored = Buffer.from(stored);

            const md5 = crypto.createHash('md5').update(String(password), 'utf8').digest();
            if (stored.length !== md5.length || !crypto.timingSafeEqual(stored, md5)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Проверка имени убрана - достаточно email + пароль

            const token = jwt.sign({ id: admin.idadmins, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 1000 * 60 * 60
            });

            return res.json({ role: 'admin', user: { id: admin.idadmins, name: admin.adminsName, email: admin.adminsEmail } });
        }

        const [clientRows] = await db.query(
            'SELECT idclients, clientsName, clientsEmail, clientsPassword FROM clients WHERE LOWER(clientsEmail) = ?',
            [emailNorm]
        );

        if (!clientRows.length) return res.status(404).json({ error: 'User not found' });

        const client = clientRows[0];
        let stored = client.clientsPassword;
        if (!stored) return res.status(401).json({ error: 'Invalid credentials' });
        if (!Buffer.isBuffer(stored)) stored = Buffer.from(stored);

        const md5 = crypto.createHash('md5').update(String(password), 'utf8').digest();
        if (stored.length !== md5.length || !crypto.timingSafeEqual(stored, md5)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Проверка имени убрана - достаточно email + пароль

        const token = jwt.sign({ id: client.idclients, role: 'client' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60
        });

        return res.json({ role: 'client', user: { id: client.idclients, name: client.clientsName, email: client.clientsEmail } });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/register-client', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const emailNorm = String(email).trim().toLowerCase();

        if (emailNorm.endsWith('@voyariestuff.com')) {
            return res.status(400).json({ error: 'Cannot register admin domain as client' });
        }

        const [exists] = await db.query('SELECT idclients FROM clients WHERE LOWER(clientsEmail) = ?', [emailNorm]);
        if (exists.length) return res.status(409).json({ error: 'Email already registered' });

        const md5 = crypto.createHash('md5').update(String(password), 'utf8').digest();

        await db.query(
            'INSERT INTO clients (clientsName, clientsEmail, clientsPassword) VALUES (?, ?, ?)',
            [String(name).trim(), emailNorm, md5]
        );

        return res.status(201).json({ message: 'Registered' });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/register-admin', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const emailNorm = String(email).trim().toLowerCase();

        if (!emailNorm.endsWith('@voyariestuff.com')) {
            return res.status(400).json({ error: 'Admin email must end with @voyariestuff.com' });
        }

        const [exists] = await db.query('SELECT idadmins FROM admins WHERE LOWER(adminsEmail) = ?', [emailNorm]);
        if (exists.length) return res.status(409).json({ error: 'Admin email already registered' });

        const md5 = crypto.createHash('md5').update(String(password), 'utf8').digest(); 

        await db.query(
            'INSERT INTO admins (adminsName, adminsEmail, adminsPassword) VALUES (?, ?, ?)',
            [String(name).trim(), emailNorm, md5]
        );

        return res.status(201).json({ message: 'Admin registered' });
    } catch (err) {
        console.error('Register admin error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
    });
    res.json({ message: 'Logged out' });
});

function authMiddleware(req, res, next) {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

app.get('/api/check-auth', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, role: req.user.role, name: req.user.name || null });
});



app.get('/api/admin-only', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json({ secret: 'admin data' });
});

app.get('/api/tours', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const section = (req.query.section || '').trim();
        const limit = Math.min(100, Number(req.query.limit) || 100);
        const sort = req.query.sort === 'popular' ? 'popular' : 'date';

        const where = [];
        const params = [];

        if (q) {
            where.push('(toursName LIKE ? OR toursDesc LIKE ? OR toursArticle LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like);
        }
        if (section) {
            where.push('toursArticle = ?');
            params.push(section);
        }

        let orderBy = 'toursDate ASC';
        if (sort === 'popular') orderBy = 'toursRating DESC, toursDate ASC';
        if (req.query.sort === 'new') orderBy = 'toursDate DESC';

        const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

        const sql = `
      SELECT idtours AS id,
             toursName AS name,
             toursDesc AS shortDesc,
             toursDate AS date,
             toursCover AS coverUrl,
             toursArticle AS article,
             toursRating AS rating
      FROM tours
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ?
    `;
        params.push(limit);

        const [rows] = await db.query(sql, params);
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/tours error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.patch('/api/tours/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const allowed = ['toursArticle', 'toursRating', 'toursName', 'toursDesc', 'toursDate', 'toursCover'];
    const updates = [];
    const params = [];
    for (const key of Object.keys(req.body || {})) {
        if (allowed.includes(key)) {
            updates.push(`${key} = ?`);
            params.push(req.body[key]);
        }
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields' });

    params.push(id);
    try {
        await db.query(`UPDATE tours SET ${updates.join(', ')} WHERE idtours = ?`, params);
        return res.json({ message: 'Updated' });
    } catch (err) {
        console.error('PATCH /api/tours/:id error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/tours/:id/requests', authMiddleware, async (req, res) => {
    const tourId = Number(req.params.id);
    if (!tourId) return res.status(400).json({ error: 'Invalid tour id' });

    try {
        const [rows] = await db.query(
            `SELECT idtoursrequests AS id,
              idtoursR AS tourId,
              idclientsR AS clientId,
              toursrequestsStatus AS status,
              toursrequestsCreatedAt AS createdAt
       FROM toursrequests
       WHERE idtoursR = ?
       ORDER BY toursrequestsCreatedAt DESC`,
            [tourId]
        );
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/tours/:id/requests error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tours/:id/request', authMiddleware, async (req, res) => {
    const tourId = Number(req.params.id);
    const userId = Number(req.user && req.user.id);
    if (!tourId || !userId) return res.status(400).json({ error: 'Bad request' });

    try {
        await db.query(
            `INSERT INTO toursrequests (idtoursR, idclientsR, toursrequestsStatus, toursrequestsCreatedAt)
       VALUES (?, ?, 'new', NOW())`,
            [tourId, userId]
        );
        return res.status(201).json({ message: 'Request submitted' });
    } catch (err) {
        console.error('POST /api/tours/:id/request error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/tours/:id/reviews', async (req, res) => {
    const tourId = Number(req.params.id);
    if (!tourId) return res.status(400).json({ error: 'Invalid tour id' });

    try {
        const [rows] = await db.query(
            `SELECT idtoursReviews AS id,
              idtours AS tourId,
              idclients AS clientId,
              toursReviewsRating AS rating,
              toursReviewsText AS text,
              toursReviewsCreatedAt AS createdAt
       FROM toursreviews
       WHERE idtours = ?
       ORDER BY toursReviewsCreatedAt DESC`,
            [tourId]
        );
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/tours/:id/reviews error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tours/:id/reviews', authMiddleware, async (req, res) => {
    const tourId = Number(req.params.id);
    const userId = Number(req.user && req.user.id);
    const { rating, text } = req.body || {};

    if (!tourId || !userId) return res.status(400).json({ error: 'Bad request' });
    const r = Number(rating);
    if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be 1..5' });

    try {
        await db.query(
            `INSERT INTO toursreviews (idtours, idclients, toursReviewsRating, toursReviewsText, toursReviewsCreatedAt)
       VALUES (?, ?, ?, ?, NOW())`,
            [tourId, userId, r, String(text || '')]
        );

        try {
            const [avgRows] = await db.query(
                `SELECT AVG(toursReviewsRating) AS avgRating
         FROM toursreviews
         WHERE idtours = ?`,
                [tourId]
            );
            const avg = avgRows && avgRows[0] && avgRows[0].avgRating ? Number(avgRows[0].avgRating) : null;
            if (avg !== null) {
                const rounded = Math.round(avg);
                await db.query(
                    `UPDATE tours SET toursRating = ? WHERE idtours = ?`,
                    [rounded, tourId]
                );
            }
        } catch (aggErr) {
            console.warn('Failed to update toursRating', aggErr);
        }

        return res.status(201).json({ message: 'Review added' });
    } catch (err) {
        console.error('POST /api/tours/:id/reviews error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
}

app.get('/api/admin/requests', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT tr.idtoursrequests AS id,
              tr.idtoursR AS idtours,
              tr.idclientsR AS idclients,
              tr.toursrequestsStatus AS status,
              tr.toursrequestsCreatedAt AS createdAt,
              t.toursName AS tourName,
              c.clientsName AS clientName
       FROM toursrequests tr
       LEFT JOIN tours t ON t.idtours = tr.idtoursR
       LEFT JOIN clients c ON c.idclients = tr.idclientsR
       ORDER BY tr.toursrequestsCreatedAt DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /api/admin/requests error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

const allowedDbStatuses = new Set(['new', 'processed', 'accepted', 'rejected']);
const statusMap = {
    in_review: 'processed',
    new: 'new',
    accepted: 'accepted',
    rejected: 'rejected'
};

app.patch('/api/admin/requests/:id', authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const requested = String(req.body.status || '').trim();
    const dbStatus = statusMap[requested];

    if (!id || !dbStatus || !allowedDbStatuses.has(dbStatus)) {
        return res.status(400).json({ error: 'Invalid id or status' });
    }

    try {
        const [result] = await db.query(
            `UPDATE toursrequests SET toursrequestsStatus = ? WHERE idtoursrequests = ?`,
            [dbStatus, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });
        const [rows] = await db.query(`SELECT * FROM toursrequests WHERE idtoursrequests = ?`, [id]);
        return res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /api/admin/requests/:id error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/requests/:id', authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [rows] = await db.query(
            `SELECT tr.idtoursrequests AS id,
              tr.idtoursR AS idtours,
              tr.idclientsR AS idclients,
              tr.toursrequestsStatus AS status,
              tr.toursrequestsCreatedAt AS createdAt,
              t.toursName AS tourName,
              c.clientsName AS clientName
       FROM toursrequests tr
       LEFT JOIN tours t ON t.idtours = tr.idtoursR
       LEFT JOIN clients c ON c.idclients = tr.idclientsR
       WHERE tr.idtoursrequests = ?
       LIMIT 1`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json(rows[0]);
    } catch (err) {
        console.error('GET /api/admin/requests/:id error', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tours', authMiddleware, requireAdmin, async (req, res) => {
    const { toursName, toursDesc, toursDate, toursCover, toursArticle, toursRating } = req.body;
    if (!toursName || !toursDate) return res.status(400).json({ error: 'Name and date required' });

    try {
        const [result] = await db.query(
            `INSERT INTO tours (toursName, toursDesc, toursDate, toursCover)
       VALUES (?, ?, ?, ?)`,
            [toursName, toursDesc || null, toursDate, toursCover || null, toursArticle || null, toursRating || null]
        );
        const insertId = result.insertId;
        const [rows] = await db.query(`SELECT * FROM tours WHERE idtours = ?`, [insertId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /api/tours error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/tours/:id', authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    try {
        const [result] = await db.query(`DELETE FROM tours WHERE idtours = ?`, [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Tour not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('DELETE /api/tours/:id error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/main.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (page.includes('.html') || page.includes('.css') || page.includes('.js') || page.includes('.png') || page.includes('.jpg')) {
        next();
    } else {
        res.sendFile(path.join(__dirname, 'public', 'main.html'));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open your browser to: http://localhost:${PORT}`);
});