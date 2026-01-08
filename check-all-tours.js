const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllTours() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'tours_db'
    });

    const [tours] = await connection.execute('SELECT idtours, toursName, toursDate FROM tours ORDER BY idtours');
    console.log('Все походы в базе данных:');
    tours.forEach((tour, i) => {
      console.log(`  ${i+1}. ${tour.toursName} - ID: ${tour.idtours} (${tour.toursDate})`);
    });

  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkAllTours();
