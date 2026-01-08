-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS tours_db;

-- Используем базу данных
USE tours_db;

-- Таблица администраторов
CREATE TABLE IF NOT EXISTS admins (
    idadmins INT AUTO_INCREMENT PRIMARY KEY,
    adminsName VARCHAR(255) NOT NULL,
    adminsEmail VARCHAR(255) UNIQUE NOT NULL,
    adminsPassword VARBINARY(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
    idclients INT AUTO_INCREMENT PRIMARY KEY,
    clientsName VARCHAR(255) NOT NULL,
    clientsEmail VARCHAR(255) UNIQUE NOT NULL,
    clientsPassword VARBINARY(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица туров
CREATE TABLE IF NOT EXISTS tours (
    idtours INT AUTO_INCREMENT PRIMARY KEY,
    toursName VARCHAR(255) NOT NULL,
    toursDesc TEXT,
    toursDate DATE NOT NULL,
    toursCover VARCHAR(500),
    toursArticle VARCHAR(255),
    toursRating INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица запросов на туры
CREATE TABLE IF NOT EXISTS toursrequests (
    idtoursrequests INT AUTO_INCREMENT PRIMARY KEY,
    idtoursR INT NOT NULL,
    idclientsR INT NOT NULL,
    toursrequestsStatus ENUM('new', 'processed', 'accepted', 'rejected') DEFAULT 'new',
    toursrequestsCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idtoursR) REFERENCES tours(idtours) ON DELETE CASCADE,
    FOREIGN KEY (idclientsR) REFERENCES clients(idclients) ON DELETE CASCADE
);

-- Таблица отзывов о турах
CREATE TABLE IF NOT EXISTS toursreviews (
    idtoursReviews INT AUTO_INCREMENT PRIMARY KEY,
    idtours INT NOT NULL,
    idclients INT NOT NULL,
    toursReviewsRating INT NOT NULL CHECK (toursReviewsRating >= 1 AND toursReviewsRating <= 5),
    toursReviewsText TEXT,
    toursReviewsCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idtours) REFERENCES tours(idtours) ON DELETE CASCADE,
    FOREIGN KEY (idclients) REFERENCES clients(idclients) ON DELETE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_admins_email ON admins(adminsEmail);
CREATE INDEX idx_clients_email ON clients(clientsEmail);
CREATE INDEX idx_tours_date ON tours(toursDate);
CREATE INDEX idx_tours_article ON tours(toursArticle);
CREATE INDEX idx_toursrequests_status ON toursrequests(toursrequestsStatus);
CREATE INDEX idx_toursrequests_created ON toursrequests(toursrequestsCreatedAt);
CREATE INDEX idx_toursreviews_tour ON toursreviews(idtours);
CREATE INDEX idx_toursreviews_created ON toursreviews(toursReviewsCreatedAt);
