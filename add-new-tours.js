require('dotenv').config();
const mysql = require('mysql2/promise');

async function addNewTours() {
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

        // Новые походы для добавления
        const newTours = [
            {
                name: 'Дретуньский полигон',
                desc: 'Исследовательский поход по заброшенному военному полигону Дретунь. Узнаете историю советской военной базы, увидите остатки военной техники и сооружений. Уникальная возможность погрузиться в атмосферу забытой истории. Продолжительность: 2 дня. Сложность: средняя.',
                date: '2025-09-15',
                cover: '/images/dretun-polygon.jpg',
                article: 'military',
                rating: 4
            },
            {
                name: 'Озеро "Воронец"',
                desc: 'Романтический поход к живописному озеру Воронец в Браславском районе. Насладитесь кристально чистой водой, посетите остров с древним монастырем и отдохните на песчаных пляжах. Идеальное место для спокойного отдыха на природе. Продолжительность: 3 дня. Сложность: легкая.',
                date: '2025-08-01',
                cover: '/images/voronets-lake.jpg',
                article: 'nature',
                rating: 5
            }
        ];

        console.log('➕ Добавляем новые походы...');

        for (const tour of newTours) {
            await connection.execute(
                'INSERT INTO tours (toursName, toursDesc, toursDate, toursCover, toursArticle, toursRating) VALUES (?, ?, ?, ?, ?, ?)',
                [tour.name, tour.desc, tour.date, tour.cover, tour.article, tour.rating]
            );
            console.log(`✅ Добавлен новый поход: "${tour.name}"`);
        }

        // Проверяем результат
        const [allTours] = await connection.execute('SELECT idtours, toursName, toursDate FROM tours ORDER BY idtours');
        console.log('\n📋 Обновленный список всех походов:');
        allTours.forEach((tour, i) => {
            console.log(`  ${i+1}. ${tour.toursName} (${tour.toursDate}) - ID: ${tour.idtours}`);
        });

        console.log('\n🎉 Новые походы успешно добавлены!');

    } catch (error) {
        console.error('❌ Ошибка:');
        console.error(error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addNewTours();
