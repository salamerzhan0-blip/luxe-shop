package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"shop/database"
	"shop/models"
	"strings"

	"github.com/gorilla/mux"
)

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write([]byte(`{"error":"` + msg + `"}`))
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	categoryID := q.Get("category_id")
	minPrice := q.Get("min_price")
	maxPrice := q.Get("max_price")
	brand := q.Get("brand")

	query := `SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id, 
		COALESCE(c.name,''), COALESCE(p.image_url,''), COALESCE(p.brand,'')
		FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`
	args := []interface{}{}

	if search != "" {
		query += " AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)"
		s := "%" + strings.ToLower(search) + "%"
		args = append(args, s, s)
	}
	if categoryID != "" {
		query += " AND p.category_id = ?"
		args = append(args, categoryID)
	}
	if minPrice != "" {
		query += " AND p.price >= ?"
		args = append(args, minPrice)
	}
	if maxPrice != "" {
		query += " AND p.price <= ?"
		args = append(args, maxPrice)
	}
	if brand != "" {
		query += " AND LOWER(p.brand) LIKE ?"
		args = append(args, "%"+strings.ToLower(brand)+"%")
	}
	query += " ORDER BY p.id"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		jsonError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.StockQuantity,
			&p.CategoryID, &p.CategoryName, &p.ImageURL, &p.Brand)
		products = append(products, p)
	}
	jsonResponse(w, products)
}

func GetProduct(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var p models.Product
	err := database.DB.QueryRow(
		`SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id,
		COALESCE(c.name,''), COALESCE(p.image_url,''), COALESCE(p.brand,'')
		FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=?`, id,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.StockQuantity,
		&p.CategoryID, &p.CategoryName, &p.ImageURL, &p.Brand)
	if err == sql.ErrNoRows {
		jsonError(w, "product not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, p)
}

func GetCategories(w http.ResponseWriter, r *http.Request) {
	rows, _ := database.DB.Query("SELECT id, name FROM categories ORDER BY id")
	defer rows.Close()
	cats := []models.Category{}
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.Name)
		cats = append(cats, c)
	}
	jsonResponse(w, cats)
}
