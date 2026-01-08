require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateExistingTours() {
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

        // Получаем все существующие туры
        const [existingTours] = await connection.execute('SELECT idtours, toursName FROM tours ORDER BY idtours');
        console.log(`📊 Найдено ${existingTours.length} туров в базе данных`);

        if (existingTours.length === 0) {
            console.log('⚠️ Туров не найдено. Сначала запустите seed-data.js');
            return;
        }

        // Новые данные для походов
        const newToursData = [
            {
                name: 'Браславские озёра',
                desc: 'Увлекательный водный поход по красивейшим озерам Беларуси. Познакомитесь с уникальной природой, увидите редких птиц и насладитесь чистой водой. Маршрут проходит через систему озер с живописными берегами. Продолжительность: 3 дня. Сложность: средняя.',
                date: '2025-06-15',
                cover: '/images/bratslav-lakes.jpg',
                article: 'nature',
                rating: 5
            },
            {
                name: 'Полесский заповедник',
                desc: 'Экологический тур по территории, пострадавшей от Чернобыльской катастрофы. Узнаете о последствиях аварии и возрождении природы в зоне отчуждения. Уникальная возможность увидеть возвращение природы. Продолжительность: 2 дня. Сложность: легкая.',
                date: '2025-07-01',
                cover: '/images/polesie-reserve.jpg',
                article: 'eco',
                rating: 4
            },
            {
                name: 'Лагерь "Звёздный"',
                desc: 'Исследовательский поход к остаткам советского пионерского лагеря. Узнаете историю места, увидите заброшенные корпуса и почувствуете атмосферу заброшенности. Идеально для любителей urbex. Продолжительность: 1 день. Сложность: легкая.',
                date: '2025-08-10',
                cover: '/images/star-camp.jpg',
                article: 'urban',
                rating: 4
            },
            {
                name: 'Болото "Ельня"',
                desc: 'Приключенческий маршрут через уникальное болото с редкой флорой и фауной. Пройдете по деревянным гатям, увидите нетронутую природу Полесья и услышите звуки болотного мира. Продолжительность: 2 дня. Сложность: средняя.',
                date: '2025-05-20',
                cover: '/images/yelnya-swamp.jpg',
                article: 'nature',
                rating: 5
            }
        ];

        // Обновляем существующие туры
        console.log('🔄 Обновляем туры...');
        for (let i = 0; i < Math.min(existingTours.length, newToursData.length); i++) {
            const tourId = existingTours[i].idtours;
            const newTour = newToursData[i];

            await connection.execute(
                'UPDATE tours SET toursName = ?, toursDesc = ?, toursDate = ?, toursCover = ?, toursArticle = ?, toursRating = ? WHERE idtours = ?',
                [newTour.name, newTour.desc, newTour.date, newTour.cover, newTour.article, newTour.rating, tourId]
            );

            console.log(`✅ Обновлен тур ID ${tourId}: "${newTour.name}"`);
        }

        // Если туров больше, чем новых данных, удаляем лишние
        if (existingTours.length > newToursData.length) {
            console.log('🗑️ Удаляем лишние туры...');
            for (let i = newToursData.length; i < existingTours.length; i++) {
                const tourId = existingTours[i].idtours;
                await connection.execute('DELETE FROM tours WHERE idtours = ?', [tourId]);
                console.log(`🗑️ Удален тур ID ${tourId}`);
            }
        }

        // Если новых данных больше, чем существующих туров, добавляем недостающие
        if (newToursData.length > existingTours.length) {
            console.log('➕ Добавляем недостающие туры...');
            for (let i = existingTours.length; i < newToursData.length; i++) {
                const newTour = newToursData[i];
                await connection.execute(
                    'INSERT INTO tours (toursName, toursDesc, toursDate, toursCover, toursArticle, toursRating) VALUES (?, ?, ?, ?, ?, ?)',
                    [newTour.name, newTour.desc, newTour.date, newTour.cover, newTour.article, newTour.rating]
                );
                console.log(`➕ Добавлен новый тур: "${newTour.name}"`);
            }
        }

        // Проверяем результат
        const [updatedTours] = await connection.execute('SELECT idtours, toursName, toursDate FROM tours ORDER BY idtours');
        console.log('\n📋 Итоговый список туров:');
        updatedTours.forEach((tour, i) => {
            console.log(`  ${i+1}. ${tour.toursName} (${tour.toursDate}) - ID: ${tour.idtours}`);
        });

        console.log('\n🎉 Туры успешно обновлены!');

    } catch (error) {
        console.error('❌ Ошибка:');
        console.error(error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateExistingTours();
