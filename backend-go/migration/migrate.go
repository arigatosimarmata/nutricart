package migration

import (
	"fmt"
	"github.com/nutricart/backend/domain"
	"gorm.io/gorm"
)

// AutoMigrateAndSeed runs GORM auto-migrations and seeds initial data (SOLID Design)
func AutoMigrateAndSeed(db *gorm.DB) error {
	// 1. Run migrations for all schemas
	err := db.AutoMigrate(
		&domain.FamilyMember{},
		&domain.ShoppingItem{},
		&domain.Recipe{},
		&domain.MealPlan{},
		&domain.HistoryRecord{},
		&domain.ProductBarcode{},
	)
	if err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}

	// 2. Seed default barcode reference items if empty
	var count int64
	db.Model(&domain.ProductBarcode{}).Count(&count)
	if count == 0 {
		sampleBarcodes := []domain.ProductBarcode{
			{
				BarcodeValue:      "8991234567890",
				ProductName:       "Suku UHT Full Cream (1L)",
				Brand:             "NutriFresh",
				PackingSize:       "1 Liter",
				CaloriesKcal:      600,
				ProteinG:          32.0,
				CarbohydratesG:    48.0,
				FatG:              32.0,
				FiberG:            0.0,
				DominantTag:       "Tinggi Kalsium",
				IsSafeForChildren: true,
			},
			{
				BarcodeValue:      "8990001112223",
				ProductName:       "Sereal Gandum Oatmeal",
				Brand:             "GoldOats",
				PackingSize:       "500 Gram",
				CaloriesKcal:      380,
				ProteinG:          12.0,
				CarbohydratesG:    66.0,
				FatG:              7.0,
				FiberG:            10.0,
				DominantTag:       "Kaya Serat pangan",
				IsSafeForChildren: true,
			},
			{
				BarcodeValue:      "8999999000001",
				ProductName:       "Mi Instan Goreng Gurih",
				Brand:             "IndoFlavour",
				PackingSize:       "85 Gram",
				CaloriesKcal:      410,
				ProteinG:          8.0,
				CarbohydratesG:    56.0,
				FatG:              17.0,
				FiberG:            1.0,
				DominantTag:       "Tinggi Natrium & Lemak",
				IsSafeForChildren: false, // Not optimal for dynamic nutrition
			},
		}

		if err := db.Create(&sampleBarcodes).Error; err != nil {
			return fmt.Errorf("failed to seed barcode statistics: %w", err)
		}
		fmt.Println("✔ Seeded default item barcodes successfully!")
	}

	// 3. Seed default recipes if empty
	db.Model(&domain.Recipe{}).Count(&count)
	if count == 0 {
		sampleRecipes := []domain.Recipe{
			{
				Title:           "Soto Ayam Madura",
				DurationMin:     45,
				Difficulty:      "Sedang",
				Calories:        380,
				ImageResURL:     "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
				Rating:          4.9,
				NutritionTag:    "Tinggi Protein",
				ProteinG:        28.0,
				CarbsG:          15.0,
				FiberG:          2.0,
				IngredientsJson: "Daging Dada Ayam, 300 gram;;Telur Bebek Rebus, 2 butir;;Soun Lunak, 50 gram;;Tauge Segar, 100 gram;;Bawang Putih, Kunyit & Jahe;;Irisan Daun Bawang, Seledri",
				StepsJson:       "Rebus dada ayam segar bersama jahe memar hingga empuk lunak;;Haluskan kunyit, bawang merah dan putih lalu tumis wangi;;Satukan tumisan bumbu bersama air kaldu rebusan;;Suwir-suwir ayam rebus diletakkan di atas mangkuk berisi soun tauge;;Siram kuah soto panas melimpah lalu taburi irisan seledri.",
				Category:        "Makan Siang",
			},
			{
				Title:           "Tumis Bayam Bening",
				DurationMin:     15,
				Difficulty:      "Mudah",
				Calories:        120,
				ImageResURL:     "https://images.unsplash.com/photo-1540420773420-3366772f4999",
				Rating:          4.7,
				NutritionTag:    "Tinggi Serat",
				ProteinG:        4.5,
				CarbsG:          18.0,
				FiberG:          6.5,
				IngredientsJson: "Bayam Hijau Segar, 2 ikat;;Jagung Manis Sisir, 1 buah;;Bawang Merah Iris, 3 siung;;Kunci Iris, 2 ruas;;Garam Lada Singkat, secukupnya",
				StepsJson:       "Didihkan air bersih bersama irisan bawang merah serta kunci;;Masukkan jagung manis sisir serut hingga empuk masak;;Masukkan bayam rimbun hijau hingga layu singkat kurang dari 3 menit;;Bubuhi garam halus lalu matikan api langsung garing segar.",
				Category:        "Makan Sore",
			},
		}

		if err := db.Create(&sampleRecipes).Error; err != nil {
			return fmt.Errorf("failed to seed healthy recipes: %w", err)
		}
		fmt.Println("✔ Seeded default recipes successfully!")
	}

	return nil
}
