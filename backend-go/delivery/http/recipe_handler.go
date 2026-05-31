package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nutricart/backend/domain"
)

type RecipeHandler struct {
	recipeUsecase domain.RecipeUsecase
}

// NewRecipeHandler registers routes for recipe querying
func NewRecipeHandler(app *fiber.App, ru domain.RecipeUsecase, authMiddleware fiber.Handler) {
	handler := &RecipeHandler{recipeUsecase: ru}

	v1 := app.Group("/api/v1")
	// Barcode retrieval is safe without authentication, or guarded as requested
	v1.Get("/nutrition/barcode/:barcode_val", handler.GetNutritionByBarcode)

	// AI Suggestion requires authentication middleware (SOLID / Security)
	v1.Post("/recipes/ai-suggest", authMiddleware, handler.GetAISuggestions)
}

func (h *RecipeHandler) GetNutritionByBarcode(c *fiber.Ctx) error {
	barcodeVal := c.Params("barcode_val")
	if barcodeVal == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "BARCODE_EMPTY",
			"message":    "Isi parameter barcode pada endpoint.",
		})
	}

	product, err := h.recipeUsecase.GetBarcodeNutrition(c.UserContext(), barcodeVal)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "DB_QUERY_ERROR",
			"message":    "Gagal melaksanakan query basis data nutrisi.",
		})
	}

	if product == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":     "error",
			"error_code": "BARCODE_NOT_FOUND",
			"message":    "Kode barcode produk belum terdaftar dalam basis gizi rujukan nasional.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"barcode_value":        product.BarcodeValue,
			"product_name":         product.ProductName,
			"brand":                product.Brand,
			"packing_size":         product.PackingSize,
			"is_safe_for_children": product.IsSafeForChildren,
			"nutritional_facts": fiber.Map{
				"calories_kcal":     product.CaloriesKcal,
				"protein_g":         product.ProteinG,
				"carbohydrates_g":   product.CarbohydratesG,
				"fat_g":             product.FatG,
				"fiber_g":           product.FiberG,
				"dominant_tag":      product.DominantTag,
			},
		},
	})
}

type AISuggestRequest struct {
	FamilyMembers              []domain.FamilyMember `json:"family_members"`
	FridgeAvailableIngredients []string              `json:"fridge_available_ingredients"`
}

func (h *RecipeHandler) GetAISuggestions(c *fiber.Ctx) error {
	var req AISuggestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_JSON",
			"message":    "Format JSON payload salah atau tidak utuh.",
		})
	}

	if len(req.FamilyMembers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "EMPTY_FAMILY_MEMBERS",
			"message":    "Profil anggota keluarga wajib dilampirkan guna meramu target gizi.",
		})
	}

	recipes, err := h.recipeUsecase.GetAISuggestedRecipes(c.UserContext(), req.FamilyMembers, req.FridgeAvailableIngredients)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "SUGGESTION_FAILED",
			"message":    err.Error(),
		})
	}

	recommendedList := make([]fiber.Map, 0)
	for _, r := range recipes {
		// Parse arrays from string delimiters
		ingredientsList := make([]string, 0)
		if r.IngredientsJson != "" {
			ingredientsList = stringsSplitNoEmpty(r.IngredientsJson, ";;")
		}

		instructionsList := make([]string, 0)
		if r.StepsJson != "" {
			instructionsList = stringsSplitNoEmpty(r.StepsJson, ";;")
		}

		recommendedList = append(recommendedList, fiber.Map{
			"id":               r.ID,
			"title":            r.Title,
			"category":         r.Category,
			"duration_minutes": r.DurationMin,
			"difficulty":       r.Difficulty,
			"macros": fiber.Map{
				"calories":  r.Calories,
				"protein_g": r.ProteinG,
				"carbs_g":   r.CarbsG,
				"fiber_g":   r.FiberG,
			},
			"nutrition_tag":    r.NutritionTag,
			"ingredients_list": ingredientsList,
			"instructions":     instructionsList,
			"rating":           r.Rating,
			"image_res_url":    r.ImageResURL,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":              "success",
		"generated_at":        "2026-05-31T03:20:26Z",
		"recommended_recipes": recommendedList,
	})
}

func stringsSplitNoEmpty(s string, sep string) []string {
	raw := ...
	// inline split helper
	parts := make([]string, 0)
	for _, v := range splitString(s, sep) {
		if v != "" {
			parts = append(parts, v)
		}
	}
	return parts
}

func splitString(s, sep string) []string {
	// Simple manual split since we want clean outputs
	var result []string
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}
