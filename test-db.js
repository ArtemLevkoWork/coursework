require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        console.log('Пытаемся подключиться к MySQL...');
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'mydb'
        });

        console.log('✅ Подключение к MySQL успешно!');

        // Проверяем список баз данных
        const [databases] = await db.execute('SHOW DATABASES');
        console.log('📋 Доступные базы данных:');
        databases.forEach(db => console.log(`  - ${db.Database}`));

        // Проверяем текущую базу данных
        const [currentDb] = await db.execute('SELECT DATABASE() as current_db');
        console.log(`📌 Текущая база данных: ${currentDb[0].current_db}`);

        // Проверяем таблицы
        const [tables] = await db.execute('SHOW TABLES');
        console.log('📊 Таблицы в текущей базе данных:');
        if (tables.length === 0) {
            console.log('  ❌ Таблиц не найдено!');
        } else {
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`  ✅ ${tableName}`);
            });
        }

        await db.end();
    } catch (error) {
        console.error('❌ Ошибка подключения к MySQL:');
        console.error(error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 MySQL сервер не запущен или недоступен');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Неверные учетные данные MySQL');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 База данных не существует');
        }
    }
}

testConnection();
