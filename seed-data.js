require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function seedData() {
    let connection;

    try {
        console.log('🔄 Подключаемся к Railway MySQL...');

        connection = await mysql.createConnection({
            host: process.env.MYSQLHOST || 'ballast.proxy.rlwy.net',
            port: process.env.MYSQLPORT || 37849,
            user: process.env.MYSQLUSER || 'root',
            password: process.env.MYSQLPASSWORD || 'KQtHbuWeIuHBtjINedlImULCnqTEJhiI',
            database: process.env.MYSQLDATABASE || 'railway',
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Подключение успешно!');

        // Создаем тестового админа
        console.log('👤 Создаем тестового администратора...');
        const adminPassword = crypto.createHash('md5').update('admin123').digest();
        try {
            await connection.execute(
                'INSERT INTO admins (adminsName, adminsEmail, adminsPassword) VALUES (?, ?, ?)',
                ['Admin User', 'admin@voyariestuff.com', adminPassword]
            );
            console.log('✅ Администратор создан');
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                console.log('⚠️ Администратор уже существует');
            } else {
                throw e;
            }
        }

        // Создаем тестового клиента
        console.log('👤 Создаем тестового клиента...');
        const clientPassword = crypto.createHash('md5').update('client123').digest();
        try {
            await connection.execute(
                'INSERT INTO clients (clientsName, clientsEmail, clientsPassword) VALUES (?, ?, ?)',
                ['Test Client', 'client@example.com', clientPassword]
            );
            console.log('✅ Клиент создан');
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                console.log('⚠️ Клиент уже существует');
            } else {
                throw e;
            }
        }

        // Создаем тестовые туры
        console.log('🏖️ Создаем тестовые походы...');
        const toursData = [
            ['Браславские озёра', 'Увлекательный водный поход...', '2025-06-15', '/images/bratslav-lakes.jpg', 'nature', 5],
            ['Полесский заповедник', 'Экологический тур по территории...', '2025-07-01', '/images/polesie-reserve.jpg', 'eco', 4],
            ['Лагерь "Звёздный"', 'Исследовательский поход к остаткам...', '2025-08-10', '/images/star-camp.jpg', 'urban', 4],
            ['Болото "Ельня"', 'Приключенческий маршрут...', '2025-05-20', '/images/yelnya-swamp.jpg', 'nature', 5],
            ['Дретуньский полигон', 'Исследовательский поход...', '2025-09-15', '/images/dretun-polygon.jpg', 'military', 4],
            ['Озеро "Воронец"', 'Романтический поход к живописному...', '2025-08-01', '/images/voronets-lake.jpg', 'nature', 5]
        ];

        for (const tour of toursData) {
            try {
                await connection.execute(
                    'INSERT INTO tours (toursName, toursDesc, toursDate, toursCover, toursArticle, toursRating) VALUES (?, ?, ?, ?, ?, ?)',
                    tour
                );
                console.log(`✅ Тур добавлен: ${tour[0]}`);
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️ Тур уже существует: ${tour[0]}`);
                } else {
                    console.log(`⚠️ Ошибка при добавлении тура ${tour[0]}: ${e.message}`);
                }
            }
        }

        console.log('\n🎉 Тестовые данные успешно добавлены в Railway!');
        console.log('');
        console.log('📋 Тестовые учетные записи:');
        console.log('   Администратор: admin@voyariestuff.com / admin123');
        console.log('   Клиент: client@example.com / client123');

    } catch (error) {
        console.error('❌ Ошибка при добавлении тестовых данных:');
        console.error(error.message);
        console.error('Код ошибки:', error.code);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedData();