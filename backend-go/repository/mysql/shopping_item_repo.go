package mysql

import (
	"context"
	"fmt"
	"github.com/nutricart/backend/domain"
	"gorm.io/gorm"
)

type mysqlShoppingItemRepository struct {
	db *gorm.DB
}

// NewShoppingItemRepository creates instance of ShoppingItemRepository
func NewShoppingItemRepository(db *gorm.DB) domain.ShoppingItemRepository {
	return &mysqlShoppingItemRepository{db: db}
}

func (r *mysqlShoppingItemRepository) SyncItems(ctx context.Context, familyID string, items []domain.ShoppingItem) error {
	// Execute as a database transaction to prevent partial updates and maintain consistency (Clean / SOLID)
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Step 1: Delete all existing shopping list items for this family
		if err := tx.Where("family_id = ?", familyID).Delete(&domain.ShoppingItem{}).Error; err != nil {
			return fmt.Errorf("failed to clear shopping items: %w", err)
		}

		// Step 2: Inject newly synchronized list if there are items to write
		if len(items) > 0 {
			// Ensure each item relates strictly to this family ID
			for i := range items {
				items[i].FamilyID = familyID
				items[i].ID = 0 // Let MySQL generate primary keys
			}

			if err := tx.Create(&items).Error; err != nil {
				return fmt.Errorf("failed to insert synced shopping items: %w", err)
			}
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("ShoppingItemRepository.SyncItems failed (family=%s): %w", familyID, err)
	}
	return nil
}

func (r *mysqlShoppingItemRepository) GetListByFamily(ctx context.Context, familyID string) ([]domain.ShoppingItem, error) {
	var items []domain.ShoppingItem
	if err := r.db.WithContext(ctx).Where("family_id = ?", familyID).Find(&items).Error; err != nil {
		return nil, fmt.Errorf("ShoppingItemRepository.GetListByFamily failed (family=%s): %w", familyID, err)
	}
	return items, nil
}
