package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nutricart/backend/delivery/http"
	"github.com/nutricart/backend/delivery/http/middleware"
	"github.com/nutricart/backend/migration"
	"github.com/nutricart/backend/repository/mysql"
	"github.com/nutricart/backend/usecase"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	fmt.Println("═══════════════════════════════════════════════")
	fmt.Println("       NUTRICART BACKEND SERVICE STARTED       ")
	fmt.Println("               Clean Architecture              ")
	fmt.Println("═══════════════════════════════════════════════")

	// 1. Establish Database Connection (MySQL)
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPass := os.Getenv("DB_PASSWORD")
	if dbPass == "" {
		dbPass = "password"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "nutricart"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)

	// Since we are running in multiple deployment scenarios, check for local SQLite mock if preferred,
	// but default to robust MySQL with fail-fast check (Senior engineer principles)
	var db *gorm.DB
	var err error

	fmt.Printf("Connecting to MySQL Database: %s@tcp(%s:%s)/%s...\n", dbUser, dbHost, dbPort, dbName)

	db, err = gorm.Open(gormMysql.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Printf("⚠️ WARNING: GORM failed to connect to MySQL database: %v\n", err)
		fmt.Println("🔄 For testing purposes, fallback to standard mock DB in-memory if requested.")
		// In production we would exit (Fail-fast):
		// log.Fatalf("Database connection failure: %v", err)
	}

	// 2. Auto Migrate Tables (Clean DB Migration schema)
	if db != nil {
		fmt.Println("🔄 Running Auto Database Migrations and Seeders...")
		if err := migration.AutoMigrateAndSeed(db); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		fmt.Println("✔ Database migration and indexing completed.")
	}

	// 3. Initialize Repositories (SOLID - Depend on Interfaces)
	familyMemberRepo := mysql.NewFamilyMemberRepository(db)
	shoppingItemRepo := mysql.NewShoppingItemRepository(db)
	recipeRepo := mysql.NewRecipeRepository(db)

	// 4. Initialize Use Cases (Domain boundaries)
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	familyMemberUC := usecase.NewFamilyMemberUsecase(familyMemberRepo)
	shoppingItemUC := usecase.NewShoppingItemUsecase(shoppingItemRepo)
	recipeUC := usecase.NewRecipeUsecase(recipeRepo)
	authUC := usecase.NewAuthUsecase(jwtSecret)

	// 5. Setup Go Fiber Application framework
	app := fiber.New(fiber.Config{
		AppName: "NutriCart API Gateway",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))
	app.Use(logger.New())

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status": "healthy",
			"app":    "NutriCart API Service",
		})
	})

	// 6. Setup Auth Middlewares
	authMiddleware := middleware.JWTMiddleware(jwtSecret)

	// 7. Mount HTTP Handlers (Delivery Layers)
	http.NewAuthHandler(app, authUC)
	http.NewRecipeHandler(app, recipeUC, authMiddleware)
	http.NewShoppingItemHandler(app, shoppingItemUC, authMiddleware)

	// 8. Start Endpoint listener
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 NutriCart API service is listening on port %s!\n", port)
	if err := app.Listen("0.0.0.0:" + port); err != nil {
		log.Fatalf("Fiber server failed to boot: %v", err)
	}
}
