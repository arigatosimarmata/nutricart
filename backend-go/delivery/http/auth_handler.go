package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nutricart/backend/domain"
)

type AuthHandler struct {
	authUsecase domain.AuthUsecase
}

// NewAuthHandler initializes Auth route routing
func NewAuthHandler(app *fiber.App, au domain.AuthUsecase) {
	handler := &AuthHandler{authUsecase: au}

	v1 := app.Group("/api/v1/auth")
	v1.Post("/google", handler.GoogleSignIn)
	v1.Post("/refresh", handler.RefreshSession)
}

type GoogleSignInRequest struct {
	IDToken string `json:"id_token"`
}

func (h *AuthHandler) GoogleSignIn(c *fiber.Ctx) error {
	var req GoogleSignInRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_JSON",
			"message":    "Payload JSON tidak terformat dengan benar.",
		})
	}

	if req.IDToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "MISSING_ID_TOKEN",
			"message":    "Google id_token wajib disertakan.",
		})
	}

	// Verify ID token
	userData, err := h.authUsecase.VerifyGoogleToken(c.UserContext(), req.IDToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":     "error",
			"error_code": "GOOGLE_AUTH_FAILED",
			"message":    err.Error(),
		})
	}

	subID := userData["sub"].(string)
	email := userData["email"].(string)

	// Issue system JWTS
	accessToken, refreshToken, err := h.authUsecase.GenerateJWT(c.UserContext(), subID, email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "TOKEN_GENERATION_FAILED",
			"message":    "Gagal mengeluarkan token otentikasi internal.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"user_id":       subID,
			"email":         email,
			"name":          userData["name"],
			"access_token":  accessToken,
			"refresh_token": refreshToken,
		},
	})
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) RefreshSession(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_JSON",
			"message":    "Format JSON body tidak valid.",
		})
	}

	if req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "MISSING_REFRESH_TOKEN",
			"message":    "Kolom refresh_token wajib dicantumkan.",
		})
	}

	newAccessToken, err := h.authUsecase.RefreshAccessToken(c.UserContext(), req.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_REFRESH_TOKEN",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"access_token": newAccessToken,
		},
	})
}
