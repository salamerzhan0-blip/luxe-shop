package handlers

import (
	"encoding/json"
	"net/http"
	"shop/database"
	"shop/middleware"
	"shop/models"
)

func GetCart(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)

	var cartID int
	err := database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)
	if err != nil {
		database.DB.Exec("INSERT INTO cart(user_id) VALUES(?)", claims.UserID)
		database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)
	}

	rows, err := database.DB.Query(`
		SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity,
			p.id, p.name, p.description, p.price, p.stock_quantity,
			COALESCE(p.image_url,''), COALESCE(p.brand,'')
		FROM cart_items ci
		JOIN products p ON ci.product_id = p.id
		WHERE ci.cart_id = ?`, cartID)
	if err != nil {
		jsonError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cart := models.Cart{ID: cartID, UserID: claims.UserID, Items: []models.CartItem{}}
	var total float64
	for rows.Next() {
		var item models.CartItem
		rows.Scan(
			&item.ID, &item.CartID, &item.ProductID, &item.Quantity,
			&item.Product.ID, &item.Product.Name, &item.Product.Description,
			&item.Product.Price, &item.Product.StockQuantity,
			&item.Product.ImageURL, &item.Product.Brand,
		)
		total += item.Product.Price * float64(item.Quantity)
		cart.Items = append(cart.Items, item)
	}
	cart.Total = total
	jsonResponse(w, cart)
}

func AddToCart(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	var req models.AddToCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ProductID == 0 {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	var cartID int
	database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)
	if cartID == 0 {
		res, _ := database.DB.Exec("INSERT INTO cart(user_id) VALUES(?)", claims.UserID)
		id, _ := res.LastInsertId()
		cartID = int(id)
	}

	_, err := database.DB.Exec(`
		INSERT INTO cart_items(cart_id, product_id, quantity) VALUES(?,?,?)
		ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = quantity + ?`,
		cartID, req.ProductID, req.Quantity, req.Quantity)
	if err != nil {
		jsonError(w, "could not add to cart", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "added to cart"})
}

func UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	var req struct {
		ProductID int `json:"product_id"`
		Quantity  int `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var cartID int
	database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)

	if req.Quantity <= 0 {
		database.DB.Exec("DELETE FROM cart_items WHERE cart_id=? AND product_id=?", cartID, req.ProductID)
	} else {
		database.DB.Exec("UPDATE cart_items SET quantity=? WHERE cart_id=? AND product_id=?",
			req.Quantity, cartID, req.ProductID)
	}
	jsonResponse(w, map[string]string{"message": "cart updated"})
}

func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	var req struct {
		ProductID int `json:"product_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var cartID int
	database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)
	database.DB.Exec("DELETE FROM cart_items WHERE cart_id=? AND product_id=?", cartID, req.ProductID)
	jsonResponse(w, map[string]string{"message": "removed"})
}
