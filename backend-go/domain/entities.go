package domain

import "time"

// FamilyMember represents a user profiles in the family
type FamilyMember struct {
	ID       uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string  `gorm:"type:varchar(100);not null" json:"name"`
	Gender   string  `gorm:"type:varchar(10);not null" json:"gender"` // "Pria" or "Wanita"
	Age      int     `gorm:"type:int;not null" json:"age"`
	WeightKg float32 `gorm:"type:float;not null" json:"weight_kg"`
	HeightCm float32 `gorm:"type:float;not null" json:"height_cm"`
	PhotoURL string  `gorm:"type:varchar(255)" json:"photo_url"`
}

// ShoppingItem represents a nutrition-focused item in the shopping cart
type ShoppingItem struct {
	ID             uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	FamilyID       string  `gorm:"type:varchar(100);index" json:"family_id"`
	Name           string  `gorm:"type:varchar(150);not null" json:"name"`
	Quantity       string  `gorm:"type:varchar(50);not null" json:"quantity"`
	NutritionTag   string  `gorm:"type:varchar(50)" json:"nutrition_tag"`
	ProteinG       float32 `gorm:"type:float" json:"protein_g"`
	FiberG         float32 `gorm:"type:float" json:"fiber_g"`
	CarbsG         float32 `gorm:"type:float" json:"carbs_g"`
	Calories       int     `gorm:"type:int" json:"calories"`
	IsChecked      bool    `gorm:"type:boolean;default:false" json:"is_checked"`
	IsAddedFromTip bool    `gorm:"type:boolean;default:false" json:"is_added_from_tip"`
}

// Recipe represents an available healthy recipe in the database
type Recipe struct {
	ID              uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	Title           string  `gorm:"type:varchar(150);not null;index" json:"title"`
	DurationMin     int     `gorm:"type:int" json:"duration_min"`
	Difficulty      string  `gorm:"type:varchar(20)" json:"difficulty"` // "Mudah", "Sedang", "Sulit"
	Calories        int     `gorm:"type:int" json:"calories"`
	ImageResURL     string  `gorm:"type:varchar(255)" json:"image_res_url"`
	Rating          float32 `gorm:"type:float" json:"rating"`
	NutritionTag    string  `gorm:"type:varchar(50)" json:"nutrition_tag"`
	ProteinG        float32 `gorm:"type:float" json:"protein_g"`
	CarbsG          float32 `gorm:"type:float" json:"carbs_g"`
	FiberG          float32 `gorm:"type:float" json:"fiber_g"`
	IngredientsJson string  `gorm:"type:text" json:"ingredients_json"` // Separated by ;;
	StepsJson       string  `gorm:"type:text" json:"steps_json"`       // Separated by ;;
	Category        string  `gorm:"type:varchar(50)" json:"category"`  // "Sarapan", "Makan Siang", etc.
}

// MealPlan represents the weekly menu planning calendar
type MealPlan struct {
	ID             uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	DayOfWeek      string  `gorm:"type:varchar(10);not null" json:"day_of_week"` // "Mon", "Tue", etc.
	MealType       string  `gorm:"type:varchar(20);not null" json:"meal_type"`   // "Breakfast", "Lunch", "Dinner"
	RecipeID       *uint   `gorm:"type:int" json:"recipe_id"`
	CustomMealName *string `gorm:"type:varchar(150)" json:"custom_meal_name"`
	Recipe         *Recipe `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
}

// HistoryRecord catalogs the weekly grocery nutrient compliance summaries
type HistoryRecord struct {
	ID          uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	FamilyID    string  `gorm:"type:varchar(100);index" json:"family_id"`
	Date        string  `gorm:"type:varchar(30);not null" json:"date"` // e.g., "31 Mei 2026"
	ItemsCount  int     `gorm:"type:int" json:"items_count"`
	TotalPrice  string  `gorm:"type:varchar(50)" json:"total_price"` // e.g. "Rp 150.000"
	CategoryTag string  `gorm:"type:varchar(50)" json:"category_tag"` // "Good Fiber", "High Protein", "Balanced"
}

// ProductBarcode defines the structured model for nutritional barcode scanning lookup
type ProductBarcode struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"-"`
	BarcodeValue      string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"barcode_value"`
	ProductName       string    `gorm:"type:varchar(150);not null" json:"product_name"`
	Brand             string    `gorm:"type:varchar(100)" json:"brand"`
	PackingSize       string    `gorm:"type:varchar(50)" json:"packing_size"`
	CaloriesKcal      int       `gorm:"type:int" json:"calories_kcal"`
	ProteinG          float32   `gorm:"type:float" json:"protein_g"`
	CarbohydratesG    float32   `gorm:"type:float" json:"carbohydrates_g"`
	FatG              float32   `gorm:"type:float" json:"fat_g"`
	FiberG            float32   `gorm:"type:float" json:"fiber_g"`
	DominantTag       string    `gorm:"type:varchar(50)" json:"dominant_tag"`
	IsSafeForChildren bool      `gorm:"type:boolean;default:true" json:"is_safe_for_children"`
	CreatedAt         time.Time `json:"_"`
}
