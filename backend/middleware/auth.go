package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

var jwtSecret = []byte("shop_secret_key_2024")

type Claims struct {
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	ExpiresAt int64  `json:"exp"`
}

func GenerateToken(userID int, username string) (string, error) {
	headers := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}

	headersJSON, err := json.Marshal(headers)
	if err != nil {
		return "", err
	}

	claims := &Claims{
		UserID:    userID,
		Username:  username,
		ExpiresAt: time.Now().Add(72 * time.Hour).Unix(),
	}

	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(headersJSON)
	encodedClaims := base64.RawURLEncoding.EncodeToString(claimsJSON)
	unsignedToken := encodedHeader + "." + encodedClaims

	signature, err := signToken(unsignedToken)
	if err != nil {
		return "", err
	}

	return unsignedToken + "." + signature, nil
}

func ParseToken(tokenStr string) (*Claims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}

	unsignedToken := parts[0] + "." + parts[1]
	if !verifyToken(unsignedToken, parts[2]) {
		return nil, errors.New("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, err
	}

	if claims.ExpiresAt > 0 && time.Unix(claims.ExpiresAt, 0).Before(time.Now()) {
		return nil, errors.New("token expired")
	}

	return &claims, nil
}

func signToken(unsignedToken string) (string, error) {
	mac := hmac.New(sha256.New, jwtSecret)
	_, err := mac.Write([]byte(unsignedToken))
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

func verifyToken(unsignedToken, signature string) bool {
	expected, err := signToken(unsignedToken)
	if err != nil {
		return false
	}
	return hmac.Equal([]byte(signature), []byte(expected))
}

type contextKey string

const UserContextKey contextKey = "user"

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"invalid token format"}`, http.StatusUnauthorized)
			return
		}
		claims, err := ParseToken(parts[1])
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserFromContext(r *http.Request) *Claims {
	claims, _ := r.Context().Value(UserContextKey).(*Claims)
	return claims
}
