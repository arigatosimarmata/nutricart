package usecase

import (
	"context"
	"errors"
	"fmt"
	"github.com/nutricart/backend/domain"
)

type shoppingItemUsecase struct {
	repo domain.ShoppingItemRepository
}

// NewShoppingItemUsecase creates a new shopping list usecase instance
func NewShoppingItemUsecase(repo domain.ShoppingItemRepository) domain.ShoppingItemUsecase {
	return &shoppingItemUsecase{repo: repo}
}

func (u *shoppingItemUsecase) SyncFamilyShoppingList(ctx context.Context, familyID string, items []domain.ShoppingItem) ([]domain.ShoppingItem, error) {
	if familyID == "" {
		return nil, errors.New("id keluarga (family_id) wajib dilampirkan guna sinkronisasi")
	}

	// Clean inputs and validate fields (SOLID)
	for i := range items {
		if items[i].Name == "" {
			return nil, errors.New("nama bahan makanan tidak boleh kosong di daftar belanja")
		}
		if items[i].Quantity == "" {
			items[i].Quantity = "1 Porsi" // Safe client-default fallbacks
		}
	}

	// Persist synchronized state
	if err := u.repo.SyncItems(ctx, familyID, items); err != nil {
		return nil, fmt.Errorf("usecase.SyncFamilyShoppingList failed: %w", err)
	}

	// Retrieve the latest server-synchronized state
	synced, err := u.repo.GetListByFamily(ctx, familyID)
	if err != nil {
		return nil, fmt.Errorf("usecase.SyncFamilyShoppingList refetch failed: %w", err)
	}

	return synced, nil
}

func (u *shoppingItemUsecase) GetFamilyShoppingList(ctx context.Context, familyID string) ([]domain.ShoppingItem, error) {
	if familyID == "" {
		return nil, errors.New("id keluarga (family_id) wajib diisi untuk menarik daftar belanja")
	}

	items, err := u.repo.GetListByFamily(ctx, familyID)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetFamilyShoppingList failed: %w", err)
	}
	return items, nil
}
