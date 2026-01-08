require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    let connection;

    try {
        console.log('🔄 Подключаемся к MySQL...');

        // Подключаемся без указания базы данных
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            multipleStatements: true // Разрешаем множественные запросы
        });

        console.log('✅ Подключение к MySQL успешно!');

        // Создаем базу данных
        console.log('🏗️ Создаем базу данных...');
        await connection.query('CREATE DATABASE IF NOT EXISTS tours_db');

        // Переключаемся на базу данных
        await connection.query('USE tours_db');

        // Читаем остальную часть SQL файла (без CREATE DATABASE)
        console.log('📖 Читаем SQL файл...');
        const fs = require('fs');
        const sqlContent = fs.readFileSync('create-tables.sql', 'utf8');

        // Выполняем SQL скрипт по частям
        console.log('⚡ Выполняем создание таблиц...');
        const statements = sqlContent.split(';').filter(stmt => stmt.trim() && !stmt.includes('CREATE DATABASE'));
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement.trim() + ';');
            }
        }

        console.log('🎉 Таблицы успешно созданы!');

        // Проверяем созданные таблицы
        const [tables] = await connection.query('SHOW TABLES');

        console.log('📊 Созданные таблицы:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`  ✅ ${tableName}`);
        });

    } catch (error) {
        console.error('❌ Ошибка при настройке базы данных:');
        console.error(error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();
