const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixImagePaths() {
  let connection;

  try {
    console.log('🔄 Подключаемся к базе данных...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'tours_db'
    });

    console.log('✅ Подключение успешно!');

    // Получаем текущие пути к изображениям
    const [tours] = await connection.execute('SELECT idtours, toursName, toursCover FROM tours ORDER BY idtours');
    console.log('Текущие пути к изображениям:');

    for (const tour of tours) {
      console.log(`  ${tour.toursName}: ${tour.toursCover}`);

      // Обновляем путь, добавляя /images/ если его нет
      let newPath = tour.toursCover;
      if (newPath && !newPath.startsWith('/images/') && !newPath.startsWith('http')) {
        newPath = `/images/${newPath}`;
      }

      await connection.execute(
        'UPDATE tours SET toursCover = ? WHERE idtours = ?',
        [newPath, tour.idtours]
      );

      console.log(`  ✅ Обновлено: ${newPath}`);
    }

    // Проверяем результат
    const [updatedTours] = await connection.execute('SELECT toursName, toursCover FROM tours ORDER BY idtours');
    console.log('\n📋 Обновленные пути:');
    updatedTours.forEach((tour, i) => {
      console.log(`  ${i+1}. ${tour.toursName}: ${tour.toursCover}`);
    });

    console.log('\n🎉 Пути к изображениям исправлены!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fixImagePaths();
