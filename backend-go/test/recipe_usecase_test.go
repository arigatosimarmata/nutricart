package test

import (
	"context"
	"testing"

	"github.com/nutricart/backend/domain"
	"github.com/nutricart/backend/usecase"
)

type MockRecipeRepository struct {
	recipes  []domain.Recipe
	barcodes map[string]*domain.ProductBarcode
	err      error
}

func (m *MockRecipeRepository) FindAll(ctx context.Context) ([]domain.Recipe, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.recipes, nil
}

func (m *MockRecipeRepository) FindByID(ctx context.Context, id uint) (*domain.Recipe, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, r := range m.recipes {
		if r.ID == id {
			return &r, nil
		}
	}
	return nil, nil
}

func (m *MockRecipeRepository) FindByCategory(ctx context.Context, category string) ([]domain.Recipe, error) {
	if m.err != nil {
		return nil, m.err
	}
	var results []domain.Recipe
	for _, r := range m.recipes {
		if r.Category == category {
			results = append(results, r)
		}
	}
	return results, nil
}

func (m *MockRecipeRepository) GetBarcodeProduct(ctx context.Context, barcode string) (*domain.ProductBarcode, error) {
	if m.err != nil {
		return nil, m.err
	}
	prod, exists := m.barcodes[barcode]
	if !exists {
		return nil, nil
	}
	return prod, nil
}

func (m *MockRecipeRepository) CreateBarcodeProduct(ctx context.Context, product *domain.ProductBarcode) error {
	if m.err != nil {
		return m.err
	}
	m.barcodes[product.BarcodeValue] = product
	return nil
}

func (m *MockRecipeRepository) CreateRecipe(ctx context.Context, recipe *domain.Recipe) error {
	if m.err != nil {
		return m.err
	}
	m.recipes = append(m.recipes, *recipe)
	return nil
}

func TestGetBarcodeNutrition_Found(t *testing.T) {
	barcodes := make(map[string]*domain.ProductBarcode)
	barcodes["8991234567890"] = &domain.ProductBarcode{
		BarcodeValue: "8991234567890",
		ProductName:  "Susu UHT Full Cream",
		Brand:        "NutriFresh",
	}

	repo := &MockRecipeRepository{barcodes: barcodes}
	uc := usecase.NewRecipeUsecase(repo)

	prod, err := uc.GetBarcodeNutrition(context.Background(), "8991234567890")
	if err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}

	if prod == nil {
		t.Fatal("expected product, got nil")
	}

	if prod.ProductName != "Susu UHT Full Cream" {
		t.Errorf("product name mismatch, got %s", prod.ProductName)
	}
}

func TestGetBarcodeNutrition_NotFound(t *testing.T) {
	repo := &MockRecipeRepository{barcodes: make(map[string]*domain.ProductBarcode)}
	uc := usecase.NewRecipeUsecase(repo)

	prod, err := uc.GetBarcodeNutrition(context.Background(), "unknown")
	if err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}

	if prod != nil {
		t.Errorf("expected nil for unfound barcode, got %v", prod)
	}
}
