package models

type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"-"`
	CreatedAt string `json:"created_at,omitempty"`
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Product struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Price         float64 `json:"price"`
	StockQuantity int     `json:"stock_quantity"`
	CategoryID    int     `json:"category_id"`
	CategoryName  string  `json:"category_name,omitempty"`
	ImageURL      string  `json:"image_url"`
	Brand         string  `json:"brand"`
}

type CartItem struct {
	ID        int     `json:"id"`
	CartID    int     `json:"cart_id"`
	ProductID int     `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Product   Product `json:"product,omitempty"`
}

type Cart struct {
	ID     int        `json:"id"`
	UserID int        `json:"user_id"`
	Items  []CartItem `json:"items"`
	Total  float64    `json:"total"`
}

type Order struct {
	ID              int         `json:"id"`
	UserID          int         `json:"user_id"`
	TotalPrice      float64     `json:"total_price"`
	Status          string      `json:"status"`
	ShippingAddress string      `json:"shipping_address"`
	CreatedAt       string      `json:"created_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID              int     `json:"id"`
	OrderID         int     `json:"order_id"`
	ProductID       int     `json:"product_id"`
	Quantity        int     `json:"quantity"`
	PriceAtPurchase float64 `json:"price_at_purchase"`
	ProductName     string  `json:"product_name,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AddToCartRequest struct {
	ProductID int `json:"product_id"`
	Quantity  int `json:"quantity"`
}

type CreateOrderRequest struct {
	ShippingAddress string `json:"shipping_address"`
}
