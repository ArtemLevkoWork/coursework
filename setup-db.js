require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDatabase() {
    let connection;

    try {
        console.log('🔄 Подключаемся к MySQL...');

        // Используем правильные переменные для Railway
        const host = process.env.MYSQLHOST || 'ballast.proxy.rlwy.net';
        const port = process.env.MYSQLPORT || 37849;
        const user = process.env.MYSQLUSER || 'root';
        const password = process.env.MYSQLPASSWORD || 'KQtHbuWeIuHBtjINedlImULCnqTEJhiI';
        const database = process.env.MYSQLDATABASE || 'railway'; // ИЗМЕНИЛИ здесь!

        console.log(`Подключение к ${host}:${port}, база: ${database}`);

        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Подключение к MySQL успешно!');

        // Читаем SQL файл
        const sqlContent = fs.readFileSync('create-tables-railway.sql', 'utf8');
        
        // Удаляем CREATE DATABASE, так как БД уже существует
        const statements = sqlContent.split(';')
            .filter(stmt => stmt.trim() && !stmt.toLowerCase().includes('create database'));
        
        console.log('⚡ Выполняем создание таблиц...');
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Выполняю: ${statement.substring(0, 60)}...`);
                await connection.query(statement.trim() + ';');
            }
        }

        console.log('🎉 Таблицы успешно созданы в Railway!');

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