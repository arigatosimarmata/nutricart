package usecase

import (
	"context"
	"errors"
	"fmt"
	"github.com/nutricart/backend/domain"
	"strings"
)

type recipeUsecase struct {
	repo domain.RecipeRepository
}

// NewRecipeUsecase creates instance of RecipeUsecase
func NewRecipeUsecase(repo domain.RecipeRepository) domain.RecipeUsecase {
	return &recipeUsecase{repo: repo}
}

func (u *recipeUsecase) GetBarcodeNutrition(ctx context.Context, barcode string) (*domain.ProductBarcode, error) {
	if barcode == "" {
		return nil, errors.New("nilai barcode tidak boleh kosong")
	}

	product, err := u.repo.GetBarcodeProduct(ctx, barcode)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetBarcodeNutrition failed: %w", err)
	}

	if product == nil {
		return nil, nil // Let controller map to BARCODE_NOT_FOUND (404)
	}

	return product, nil
}

func (u *recipeUsecase) GetAISuggestedRecipes(ctx context.Context, members []domain.FamilyMember, availableIngredients []string) ([]domain.Recipe, error) {
	if len(members) == 0 {
		return nil, errors.New("minimal satu profil anggota keluarga wajib dilampirkan guna analisis nutrisi")
	}

	// Dynamic Caloric & Nutritional target calculation based on family member profiles (SOLID / Clean Business logic)
	var totalCalorieTarget float32
	var totalProteinTarget float32
	for _, m := range members {
		// Calculate Basal Energy Expenditure (BMR) using Mifflin-St Jeor formula
		var bmr float32
		if m.Gender == "Pria" {
			bmr = 10*m.WeightKg + 6.25*m.HeightCm - 5*float32(m.Age) + 5
		} else {
			bmr = 10*m.WeightKg + 6.25*m.HeightCm - 5*float32(m.Age) - 161
		}
		// Multiply by Sedentary activity level (e.g. 1.2) for daily maintenance calories
		maint := bmr * 1.2
		totalCalorieTarget += maint
		totalProteinTarget += m.WeightKg * 1.2 // 1.2 grams of protein per kg of bodyweight
	}

	// Fetch all recipes from DB and select matching candidates
	allRecipes, err := u.repo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetAISuggestedRecipes database query failed: %w", err)
	}

	var suggestions []domain.Recipe
	ingredientsJoined := strings.ToLower(strings.Join(availableIngredients, " "))

	// Heuristic matching model: select recipes matching available ingredients or nutritional constraints
	for _, r := range allRecipes {
		matchScore := 0
		ingredientsInRecipe := strings.Split(strings.ToLower(r.IngredientsJson), ";;")

		// Check ingredient intersections
		for _, ing := range ingredientsInRecipe {
			for _, avail := range availableIngredients {
				if strings.Contains(ing, strings.ToLower(avail)) || strings.Contains(strings.ToLower(avail), ing) {
					matchScore += 2
				}
			}
		}

		// Check if recipe aligns with calculated family targets (e.g., protein contribution)
		if r.ProteinG >= (totalProteinTarget/3)*0.8 { // Core meal contributing to a solid third of protein goals
			matchScore += 1
		}

		// Inject to recommendations if match exists
		if matchScore > 0 || len(suggestions) < 3 {
			suggestions = append(suggestions, r)
		}

		// Return top recommendations limits
		if len(suggestions) >= 5 {
			break
		}
	}

	// If no recipes are seeded yet, build dynamic default items supporting immediate integration
	if len(suggestions) == 0 {
		ingredientsStr := strings.Join(availableIngredients, " ")
		suggestions = []domain.Recipe{
			{
				ID:          9991,
				Title:       "Tumis Sehat Campur " + ingredientsStr,
				DurationMin: 15,
				Difficulty:  "Mudah",
				Calories:    int(totalCalorieTarget / 4), // Breakfast-sized portion
				ImageResURL: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
				Rating:      4.8,
				NutritionTag: "Kaya Serat",
				ProteinG:    12.5,
				CarbsG:      30.0,
				FiberG:      6.8,
				IngredientsJson: strings.Join(availableIngredients, ";;"),
				StepsJson:   "Cuci bersih seluruh bahan mentah;;Tumis bawang putih dalam wajan anti lengket;;Masukkan bahan pangan sayur hingga layu bergizi;;Sajikan selagi hangat.",
				Category:    "Makan Siang",
			},
		}
	}

	return suggestions, nil
}

func (u *recipeUsecase) GetAllRecipes(ctx context.Context) ([]domain.Recipe, error) {
	recipes, err := u.repo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetAllRecipes failed: %w", err)
	}
	return recipes, nil
}
