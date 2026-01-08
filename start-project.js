#!/usr/bin/env node

/**
 * Скрипт быстрого запуска проекта
 * Выполняет настройку БД и запуск сервера
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Запуск туристического агентства...\n');

// Шаг 1: Проверка наличия .env файла
if (!fs.existsSync('.env')) {
    console.log('❌ Файл .env не найден!');
    console.log('Создайте файл .env со следующими настройками:');
    console.log(`
DB_HOST=localhost
DB_USER=root
DB_PASS=1234
DB_NAME=tours_db
JWT_SECRET=very_strong_secret_here
FRONTEND_ORIGIN=http://localhost:5500
NODE_ENV=development
    `);
    process.exit(1);
}

try {
    // Шаг 2: Настройка базы данных
    console.log('📊 Настройка базы данных...');
    execSync('node setup-db.js', { stdio: 'inherit' });

    // Шаг 3: Заполнение тестовыми данными
    console.log('\n📝 Добавление тестовых данных...');
    execSync('node seed-data.js', { stdio: 'inherit' });

    // Шаг 4: Запуск сервера
    console.log('\n🌐 Запуск сервера...');
    console.log('Приложение будет доступно по адресу: http://localhost:3000');
    console.log('\n📋 Тестовые учетные записи:');
    console.log('   Администратор: admin@voyariestuff.com / admin123');
    console.log('   Клиент: client@example.com / client123');

    execSync('node app.js', { stdio: 'inherit' });

} catch (error) {
    console.error('❌ Ошибка при запуске проекта:', error.message);
    process.exit(1);
}
