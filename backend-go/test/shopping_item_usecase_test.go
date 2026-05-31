package test

import (
	"context"
	"testing"

	"github.com/nutricart/backend/domain"
	"github.com/nutricart/backend/usecase"
)

type MockShoppingItemRepository struct {
	items []domain.ShoppingItem
	err   error
}

func (m *MockShoppingItemRepository) SyncItems(ctx context.Context, familyID string, items []domain.ShoppingItem) error {
	if m.err != nil {
		return m.err
	}
	// Clear and insert
	var newItems []domain.ShoppingItem
	for _, it := range m.items {
		if it.FamilyID != familyID {
			newItems = append(newItems, it)
		}
	}
	for _, it := range items {
		it.FamilyID = familyID
		newItems = append(newItems, it)
	}
	m.items = newItems
	return nil
}

func (m *MockShoppingItemRepository) GetListByFamily(ctx context.Context, familyID string) ([]domain.ShoppingItem, error) {
	if m.err != nil {
		return nil, m.err
	}
	var results []domain.ShoppingItem
	for _, it := range m.items {
		if it.FamilyID == familyID {
			results = append(results, it)
		}
	}
	return results, nil
}

func TestSyncShoppingList_Valid(t *testing.T) {
	repo := &MockShoppingItemRepository{}
	uc := usecase.NewShoppingItemUsecase(repo)

	familyID := "fam_dewi_abc123"
	items := []domain.ShoppingItem{
		{
			Name:         "Telur Ayam",
			Quantity:     "1 Kg",
			NutritionTag: "Tinggi Protein",
			ProteinG:     60.0,
			Calories:     700,
		},
		{
			Name:         "Bayam Hijau",
			Quantity:     "2 Ikat",
			NutritionTag: "Sumber Zat Besi",
			ProteinG:     4.0,
			Calories:     80,
		},
	}

	result, err := uc.SyncFamilyShoppingList(context.Background(), familyID, items)
	if err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}

	if len(result) != 2 {
		t.Errorf("expected 2 synced items, got %d", len(result))
	}

	if result[0].Name != "Telur Ayam" || result[1].Name != "Bayam Hijau" {
		t.Errorf("synced items name mismatch: %v", result)
	}
}

func TestSyncShoppingList_EmptyFamily(t *testing.T) {
	repo := &MockShoppingItemRepository{}
	uc := usecase.NewShoppingItemUsecase(repo)

	_, err := uc.SyncFamilyShoppingList(context.Background(), "", []domain.ShoppingItem{})
	if err == nil {
		t.Fatal("expected error for empty family ID, got nil")
	}
}
