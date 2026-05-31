package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nutricart/backend/domain"
)

type ShoppingItemHandler struct {
	shoppingUsecase domain.ShoppingItemUsecase
}

// NewShoppingItemHandler maps routing configurations for shopping sync
func NewShoppingItemHandler(app *fiber.App, su domain.ShoppingItemUsecase, authMiddleware fiber.Handler) {
	handler := &ShoppingItemHandler{shoppingUsecase: su}

	v1 := app.Group("/api/v1/shopping-list")
	v1.Put("/sync", authMiddleware, handler.SyncShoppingList)
	v1.Get("/list", authMiddleware, handler.GetShoppingList)
}

type ShoppingSyncRequest struct {
	FamilyID        string                `json:"family_id"`
	ClientTimestamp string                `json:"client_timestamp"`
	Items           []domain.ShoppingItem `json:"items"`
}

func (h *ShoppingItemHandler) SyncShoppingList(c *fiber.Ctx) error {
	var req ShoppingSyncRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_JSON",
			"message":    "JSON payload daftar belanja salah format.",
		})
	}

	if req.FamilyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "MISSING_FAMILY_ID",
			"message":    "Kolom family_id wajib disertakan untuk sinkronisasi.",
		})
	}

	// Trigger synchronization logic
	syncedItems, err := h.shoppingUsecase.SyncFamilyShoppingList(c.UserContext(), req.FamilyID, req.Items)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "SYNC_FAILED",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":                       "success",
		"last_sync_server_time":        "2026-05-31T03:20:26Z",
		"action_taken":                 "merged",
		"current_shopping_items_count": len(syncedItems),
		"message":                      "Daftar belanja keluarga berhasil tersimpan di awan secara sinkron.",
	})
}

func (h *ShoppingItemHandler) GetShoppingList(c *fiber.Ctx) error {
	familyID := c.Query("family_id")
	if familyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "MISSING_FAMILY_ID",
			"message":    "Parameter kueri family_id wajib disertakan.",
		})
	}

	items, err := h.shoppingUsecase.GetFamilyShoppingList(c.UserContext(), familyID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "RETRIEVAL_FAILED",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data":   items,
	})
}
