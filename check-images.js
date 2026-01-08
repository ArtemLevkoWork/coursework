const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTourImages() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'tours_db'
    });

    const [tours] = await connection.execute('SELECT toursName, toursCover FROM tours ORDER BY idtours');
    console.log('Изображения туров в базе данных:');
    tours.forEach((tour, i) => {
      console.log(`  ${i+1}. ${tour.toursName}: ${tour.toursCover}`);
    });

  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkTourImages();
