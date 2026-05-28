package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"shop/database"
	"shop/middleware"
	"shop/models"
)

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func comparePassword(hash, password string) bool {
	return hash == hashPassword(password)
}

func Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		jsonError(w, "all fields required", http.StatusBadRequest)
		return
	}
	hash := hashPassword(req.Password)
	res, err := database.GetDB().Exec(
		"INSERT INTO users(username, email, password) VALUES(?,?,?)",
		req.Username, req.Email, hash,
	)
	if err != nil {
		jsonError(w, "user already exists", http.StatusConflict)
		return
	}
	userID, _ := res.LastInsertId()
	// create cart for user
	database.DB.Exec("INSERT INTO cart(user_id) VALUES(?)", userID)

	token, _ := middleware.GenerateToken(int(userID), req.Username)
	jsonResponse(w, map[string]interface{}{
		"token":    token,
		"user_id":  userID,
		"username": req.Username,
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, username, email, password FROM users WHERE email=?", req.Email,
	).Scan(&user.ID, &user.Username, &user.Email, &user.Password)
	if err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if !comparePassword(user.Password, req.Password) {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	// ensure cart exists
	database.DB.Exec("INSERT OR IGNORE INTO cart(user_id) VALUES(?)", user.ID)

	token, _ := middleware.GenerateToken(user.ID, user.Username)
	jsonResponse(w, map[string]interface{}{
		"token":    token,
		"user_id":  user.ID,
		"username": user.Username,
	})
}

func Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	var user models.User
	database.DB.QueryRow(
		"SELECT id, username, email, created_at FROM users WHERE id=?", claims.UserID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt)
	jsonResponse(w, user)
}
