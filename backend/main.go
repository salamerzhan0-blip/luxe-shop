package main

import (
	"log"
	"net/http"
	"shop/database"
	"shop/handlers"
	"shop/middleware"
)

func main() {
	database.Init("./shop.db")
	log.Println("Database initialized")

	r := http.NewServeMux()

	// Auth routes
	r.HandleFunc("/api/auth/register", handlers.Register)
	r.HandleFunc("/api/auth/login", handlers.Login)
	r.Handle("/api/auth/me", middleware.Auth(http.HandlerFunc(handlers.Me)))

	// Public routes
	r.HandleFunc("/api/products", handlers.GetProducts)
	r.HandleFunc("/api/products/", handlers.GetProduct)
	r.HandleFunc("/api/categories", handlers.GetCategories)

	// Protected routes
	r.Handle("/api/cart", middleware.Auth(http.HandlerFunc(handlers.GetCart)))
	r.Handle("/api/cart/add", middleware.Auth(http.HandlerFunc(handlers.AddToCart)))
	r.Handle("/api/cart/update", middleware.Auth(http.HandlerFunc(handlers.UpdateCartItem)))
	r.Handle("/api/cart/remove", middleware.Auth(http.HandlerFunc(handlers.RemoveFromCart)))
	r.Handle("/api/orders", middleware.Auth(http.HandlerFunc(handlers.CreateOrder)))
	r.Handle("/api/orders/my", middleware.Auth(http.HandlerFunc(handlers.GetMyOrders)))

	// Serve frontend static files
	r.Handle("/", http.FileServer(http.Dir("../frontend")))

	log.Println("Server started on :3000")
	log.Fatal(http.ListenAndServe(":3000", corsMiddleware(r)))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
