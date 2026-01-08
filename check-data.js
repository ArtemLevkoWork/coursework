require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkData() {
    let connection;

    try {
        console.log('🔄 Подключаемся к базе данных...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'tours_db'
        });

        console.log('✅ Подключение успешно!\n');

        // Проверяем администраторов
        const [admins] = await connection.execute('SELECT COUNT(*) as count FROM admins');
        console.log(`👑 Администраторов: ${admins[0].count}`);

        // Проверяем клиентов
        const [clients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
        console.log(`👤 Клиентов: ${clients[0].count}`);

        // Проверяем туры
        const [tours] = await connection.execute('SELECT COUNT(*) as count FROM tours');
        console.log(`🏖️ Туров: ${tours[0].count}`);

        // Проверяем запросы
        const [requests] = await connection.execute('SELECT COUNT(*) as count FROM toursrequests');
        console.log(`📝 Запросов на туры: ${requests[0].count}`);

        // Проверяем отзывы
        const [reviews] = await connection.execute('SELECT COUNT(*) as count FROM toursreviews');
        console.log(`⭐ Отзывов: ${reviews[0].count}`);

        console.log('\n📊 Детальная информация:');

        if (admins[0].count > 0) {
            const [adminData] = await connection.execute('SELECT adminsName, adminsEmail FROM admins LIMIT 5');
            console.log('\nАдминистраторы:');
            adminData.forEach((admin, i) => console.log(`  ${i+1}. ${admin.adminsName} (${admin.adminsEmail})`));
        }

        if (clients[0].count > 0) {
            const [clientData] = await connection.execute('SELECT clientsName, clientsEmail FROM clients LIMIT 5');
            console.log('\nКлиенты:');
            clientData.forEach((client, i) => console.log(`  ${i+1}. ${client.clientsName} (${client.clientsEmail})`));
        }

        if (tours[0].count > 0) {
            const [tourData] = await connection.execute('SELECT toursName, toursDate FROM tours LIMIT 5');
            console.log('\nТуры:');
            tourData.forEach((tour, i) => console.log(`  ${i+1}. ${tour.toursName} (${tour.toursDate})`));
        }

    } catch (error) {
        console.error('❌ Ошибка:');
        console.error(error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkData();
