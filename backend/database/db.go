package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(path string) {
	var err error
	DB, err = sql.Open("sqlite", path)
	if err != nil {
		log.Fatal("Failed to open DB:", err)
	}
	DB.Exec("PRAGMA foreign_keys = ON")
	DB.Exec("PRAGMA journal_mode=WAL")
	createTables()
	seedData()
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			price REAL NOT NULL,
			stock_quantity INTEGER DEFAULT 0,
			category_id INTEGER,
			image_url TEXT,
			brand TEXT,
			FOREIGN KEY (category_id) REFERENCES categories(id)
		)`,
		`CREATE TABLE IF NOT EXISTS cart (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER UNIQUE NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS cart_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cart_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			quantity INTEGER DEFAULT 1,
			FOREIGN KEY (cart_id) REFERENCES cart(id),
			FOREIGN KEY (product_id) REFERENCES products(id),
			UNIQUE(cart_id, product_id)
		)`,
		`CREATE TABLE IF NOT EXISTS orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			total_price REAL NOT NULL,
			status TEXT DEFAULT 'processing',
			shipping_address TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS order_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			order_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			quantity INTEGER NOT NULL,
			price_at_purchase REAL NOT NULL,
			FOREIGN KEY (order_id) REFERENCES orders(id),
			FOREIGN KEY (product_id) REFERENCES products(id)
		)`,
	}
	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			log.Fatal("Create table error:", err)
		}
	}
}

func seedData() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if count > 0 {
		return
	}

	cats := []string{"Электроника", "Одежда", "Книги", "Спорт", "Дом и сад"}
	for _, c := range cats {
		DB.Exec("INSERT INTO categories(name) VALUES(?)", c)
	}

	products := []struct {
		name, desc, brand, img string
		price                  float64
		stock, catID           int
	}{
		{"iPhone 15 Pro", "Флагманский смартфон Apple с чипом A17 Pro, титановым корпусом и улучшенной камерой.", "Apple", "https://images.unsplash.com/photo-1696446701796-da61c52b4dc3?w=400", 89990, 25, 1},
		{"Samsung Galaxy S24 Ultra", "Топовый Android-смартфон со встроенным стилусом S Pen и мощной камерой.", "Samsung", "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400", 79990, 30, 1},
		{"MacBook Pro 14\"", "Ноутбук Apple с чипом M3 Pro, яркий Liquid Retina XDR дисплей.", "Apple", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400", 159990, 15, 1},
		{"Sony WH-1000XM5", "Беспроводные наушники с лучшим шумоподавлением в классе.", "Sony", "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400", 29990, 40, 1},
		{"iPad Air 5", "Универсальный планшет с чипом M1 и поддержкой Apple Pencil.", "Apple", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400", 59990, 20, 1},
		{"Кроссовки Nike Air Max 270", "Лёгкие беговые кроссовки с воздушной подушкой Max Air.", "Nike", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", 8990, 50, 4},
		{"Футболка Adidas Originals", "Классическая хлопковая футболка с логотипом Trefoil.", "Adidas", "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=400", 2490, 100, 2},
		{"Джинсы Levi's 501", "Оригинальные прямые джинсы из плотного денима.", "Levi's", "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", 5990, 60, 2},
		{"Книга \"Чистый код\"", "Бестселлер Роберта Мартина о написании качественного программного кода.", "Питер", "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400", 1290, 200, 3},
		{"Книга \"Мастер и Маргарита\"", "Легендарный роман Михаила Булгакова.", "АСТ", "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400", 490, 300, 3},
		{"Гантели 10кг", "Разборные гантели из хромированной стали.", "SportElite", "https://images.unsplash.com/photo-1585713181535-c0e9e1f7f1d7?w=400", 3990, 35, 4},
		{"Коврик для йоги", "Нескользящий коврик из натурального каучука толщиной 6мм.", "YogaLife", "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=400", 2190, 45, 4},
		{"Настольная лампа LED", "Светодиодная лампа с регулировкой яркости и цветовой температуры.", "Xiaomi", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400", 3490, 55, 5},
		{"Робот-пылесос Roomba", "Умный робот-пылесос с картографированием помещения.", "iRobot", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", 34990, 18, 5},
		{"Кофемашина De'Longhi", "Автоматическая кофемашина с капучинатором.", "De'Longhi", "https://images.unsplash.com/photo-1610374792793-f016b77ca51a?w=400", 24990, 22, 5},
	}

	for _, p := range products {
		DB.Exec(`INSERT INTO products(name,description,price,stock_quantity,category_id,image_url,brand) VALUES(?,?,?,?,?,?,?)`,
			p.name, p.desc, p.price, p.stock, p.catID, p.img, p.brand)
	}
}
func GetDB() *sql.DB {
	return DB
}
