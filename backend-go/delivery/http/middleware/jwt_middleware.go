package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/nutricart/backend/usecase"
)

// JWTMiddleware creates an authentication middleware using Go Fiber
func JWTMiddleware(secretKey []byte) fiber.Handler {
	if len(secretKey) == 0 {
		secretKey = []byte("NutriCartSecretSuperSecureKey_2026")
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":     "error",
				"error_code": "MISSING_TOKEN",
				"message":    "Otorisasi ditolak: Header Authorization kosong.",
			})
		}

		// Header format must be "Bearer <Token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":     "error",
				"error_code": "MALFORMED_TOKEN",
				"message":    "Format header Authorization harus: Bearer <token>",
			})
		}

		tokenString := parts[1]

		// Parse token claims
		token, err := jwt.ParseWithClaims(tokenString, &usecase.CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("metode penandatanganan tidak valid: %v", token.Header["alg"])
			}
			return secretKey, nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":     "error",
				"error_code": "INVALID_TOKEN",
				"message":    "Token kedaluwarsa atau tidak valid. Silakan lakukan penyegaran token.",
			})
		}

		claims, ok := token.Claims.(*usecase.CustomClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":     "error",
				"error_code": "CORRUPTED_CLAIMS",
				"message":    "Data otorisasi token rusak.",
			})
		}

		// Inject verified claims to Fiber Local context
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)

		return c.Next()
	}
}
