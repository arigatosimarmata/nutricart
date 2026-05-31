package mysql

import (
	"context"
	"fmt"
	"github.com/nutricart/backend/domain"
	"gorm.io/gorm"
)

type mysqlRecipeRepository struct {
	db *gorm.DB
}

// NewRecipeRepository creates instance of RecipeRepository
func NewRecipeRepository(db *gorm.DB) domain.RecipeRepository {
	return &mysqlRecipeRepository{db: db}
}

func (r *mysqlRecipeRepository) FindAll(ctx context.Context) ([]domain.Recipe, error) {
	var recipes []domain.Recipe
	if err := r.db.WithContext(ctx).Find(&recipes).Error; err != nil {
		return nil, fmt.Errorf("RecipeRepository.FindAll failed: %w", err)
	}
	return recipes, nil
}

func (r *mysqlRecipeRepository) FindByID(ctx context.Context, id uint) (*domain.Recipe, error) {
	var recipe domain.Recipe
	if err := r.db.WithContext(ctx).First(&recipe, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("RecipeRepository.FindByID failed (id=%d): %w", id, err)
	}
	return &recipe, nil
}

func (r *mysqlRecipeRepository) FindByCategory(ctx context.Context, category string) ([]domain.Recipe, error) {
	var recipes []domain.Recipe
	if err := r.db.WithContext(ctx).Where("category = ?", category).Find(&recipes).Error; err != nil {
		return nil, fmt.Errorf("RecipeRepository.FindByCategory failed (cat=%s): %w", category, err)
	}
	return recipes, nil
}

func (r *mysqlRecipeRepository) GetBarcodeProduct(ctx context.Context, barcode string) (*domain.ProductBarcode, error) {
	var product domain.ProductBarcode
	if err := r.db.WithContext(ctx).Where("barcode_value = ?", barcode).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("RecipeRepository.GetBarcodeProduct failed (barcode=%s): %w", barcode, err)
	}
	return &product, nil
}

func (r *mysqlRecipeRepository) CreateBarcodeProduct(ctx context.Context, product *domain.ProductBarcode) error {
	if err := r.db.WithContext(ctx).Create(product).Error; err != nil {
		return fmt.Errorf("RecipeRepository.CreateBarcodeProduct failed: %w", err)
	}
	return nil
}

func (r *mysqlRecipeRepository) CreateRecipe(ctx context.Context, recipe *domain.Recipe) error {
	if err := r.db.WithContext(ctx).Create(recipe).Error; err != nil {
		return fmt.Errorf("RecipeRepository.CreateRecipe failed: %w", err)
	}
	return nil
}
