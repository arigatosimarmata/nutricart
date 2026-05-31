package domain

import "context"

// FamilyMemberRepository defines the database actions for family members
type FamilyMemberRepository interface {
	Create(ctx context.Context, member *FamilyMember) error
	FindAll(ctx context.Context) ([]FamilyMember, error)
	FindByID(ctx context.Context, id uint) (*FamilyMember, error)
	Update(ctx context.Context, member *FamilyMember) error
	Delete(ctx context.Context, id uint) error
}

// FamilyMemberUsecase contains the core business rules for family members
type FamilyMemberUsecase interface {
	RegisterMember(ctx context.Context, member *FamilyMember) error
	GetAllMembers(ctx context.Context) ([]FamilyMember, error)
	GetMemberByID(ctx context.Context, id uint) (*FamilyMember, error)
	UpdateMember(ctx context.Context, member *FamilyMember) error
	DeleteMember(ctx context.Context, id uint) error
}

// ShoppingItemRepository manages ShoppingItem database transactions
type ShoppingItemRepository interface {
	SyncItems(ctx context.Context, familyID string, items []ShoppingItem) error
	GetListByFamily(ctx context.Context, familyID string) ([]ShoppingItem, error)
}

// ShoppingItemUsecase manages shopping synchronization business processes
type ShoppingItemUsecase interface {
	SyncFamilyShoppingList(ctx context.Context, familyID string, items []ShoppingItem) ([]ShoppingItem, error)
	GetFamilyShoppingList(ctx context.Context, familyID string) ([]ShoppingItem, error)
}

// RecipeRepository controls recipe search query execution
type RecipeRepository interface {
	FindAll(ctx context.Context) ([]Recipe, error)
	FindByID(ctx context.Context, id uint) (*Recipe, error)
	FindByCategory(ctx context.Context, category string) ([]Recipe, error)
	GetBarcodeProduct(ctx context.Context, barcode string) (*ProductBarcode, error)
	CreateBarcodeProduct(ctx context.Context, product *ProductBarcode) error
	CreateRecipe(ctx context.Context, recipe *Recipe) error
}

// RecipeUsecase defines recipe curation and AI generation workflows
type RecipeUsecase interface {
	GetBarcodeNutrition(ctx context.Context, barcode string) (*ProductBarcode, error)
	GetAISuggestedRecipes(ctx context.Context, members []FamilyMember, availableIngredients []string) ([]Recipe, error)
	GetAllRecipes(ctx context.Context) ([]Recipe, error)
}

// AuthUsecase manages Google Authentication and JWT validation
type AuthUsecase interface {
	VerifyGoogleToken(ctx context.Context, idToken string) (map[string]interface{}, error)
	GenerateJWT(ctx context.Context, userID string, email string) (string, string, error) // AccessToken, RefreshToken, Error
	RefreshAccessToken(ctx context.Context, refreshToken string) (string, error)
}
