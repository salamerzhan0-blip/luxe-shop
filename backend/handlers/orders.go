package handlers

import (
	"encoding/json"
	"net/http"
	"shop/database"
	"shop/middleware"
	"shop/models"
)

func CreateOrder(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	var req models.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ShippingAddress == "" {
		jsonError(w, "shipping address required", http.StatusBadRequest)
		return
	}

	// get cart
	var cartID int
	database.DB.QueryRow("SELECT id FROM cart WHERE user_id=?", claims.UserID).Scan(&cartID)
	if cartID == 0 {
		jsonError(w, "cart not found", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(`
		SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity
		FROM cart_items ci JOIN products p ON ci.product_id = p.id
		WHERE ci.cart_id = ?`, cartID)
	if err != nil {
		jsonError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type item struct {
		productID int
		quantity  int
		price     float64
		stock     int
	}
	var items []item
	var total float64
	for rows.Next() {
		var it item
		rows.Scan(&it.productID, &it.quantity, &it.price, &it.stock)
		if it.stock < it.quantity {
			jsonError(w, "insufficient stock", http.StatusConflict)
			return
		}
		total += it.price * float64(it.quantity)
		items = append(items, it)
	}

	if len(items) == 0 {
		jsonError(w, "cart is empty", http.StatusBadRequest)
		return
	}

	tx, _ := database.DB.Begin()
	res, err := tx.Exec(
		"INSERT INTO orders(user_id, total_price, status, shipping_address) VALUES(?,?,?,?)",
		claims.UserID, total, "processing", req.ShippingAddress,
	)
	if err != nil {
		tx.Rollback()
		jsonError(w, "could not create order", http.StatusInternalServerError)
		return
	}
	orderID, _ := res.LastInsertId()

	for _, it := range items {
		tx.Exec(
			"INSERT INTO order_items(order_id, product_id, quantity, price_at_purchase) VALUES(?,?,?,?)",
			orderID, it.productID, it.quantity, it.price,
		)
		tx.Exec(
			"UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
			it.quantity, it.productID,
		)
	}
	tx.Exec("DELETE FROM cart_items WHERE cart_id=?", cartID)
	tx.Commit()

	jsonResponse(w, map[string]interface{}{"order_id": orderID, "total": total, "status": "processing"})
}

func GetMyOrders(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)

	rows, err := database.DB.Query(`
		SELECT id, user_id, total_price, status, shipping_address, created_at
		FROM orders WHERE user_id=? ORDER BY created_at DESC`, claims.UserID)
	if err != nil {
		jsonError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		rows.Scan(&o.ID, &o.UserID, &o.TotalPrice, &o.Status, &o.ShippingAddress, &o.CreatedAt)

		irows, _ := database.DB.Query(`
			SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price_at_purchase,
				COALESCE(p.name,'')
			FROM order_items oi LEFT JOIN products p ON oi.product_id=p.id
			WHERE oi.order_id=?`, o.ID)
		for irows.Next() {
			var it models.OrderItem
			irows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.PriceAtPurchase, &it.ProductName)
			o.Items = append(o.Items, it)
		}
		irows.Close()
		orders = append(orders, o)
	}
	jsonResponse(w, orders)
}
