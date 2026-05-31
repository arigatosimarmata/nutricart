package test

import (
	"context"
	"testing"

	"github.com/nutricart/backend/usecase"
)

func TestAuthUsecase_GenerateAndVerify(t *testing.T) {
	secret := []byte("MyTestAuthSecretKey_99998888_2026")
	uc := usecase.NewAuthUsecase(secret)

	// Step 1: Generate access and refresh tokens
	userID := "google_user_dewi_123"
	email := "arigatosimarmata5@gmail.com"

	access, refresh, err := uc.GenerateJWT(context.Background(), userID, email)
	if err != nil {
		t.Fatalf("expected no errors generating JWT, got %v", err)
	}

	if access == "" || refresh == "" {
		t.Fatal("expected non-empty tokens")
	}

	// Step 2: Refresh Access Token using Refresh Token
	newAccess, err := uc.RefreshAccessToken(context.Background(), refresh)
	if err != nil {
		t.Fatalf("expected no errors refreshing session, got %v", err)
	}

	if newAccess == "" {
		t.Fatal("expected non-empty refreshed access token")
	}
}

func TestAuthUsecase_InvalidRefresh(t *testing.T) {
	secret := []byte("MyTestAuthSecretKey_99998888_2026")
	uc := usecase.NewAuthUsecase(secret)

	_, err := uc.RefreshAccessToken(context.Background(), "invalid_garbage_token")
	if err == nil {
		t.Fatal("expected error parsing invalid refresh token, got nil")
	}
}
