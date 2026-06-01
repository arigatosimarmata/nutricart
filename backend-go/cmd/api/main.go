package main

import (
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/nutricart/backend/delivery/http"
	"github.com/nutricart/backend/delivery/http/middleware"
	"github.com/nutricart/backend/migration"
	"github.com/nutricart/backend/pkg/logger"
	"github.com/nutricart/backend/repository/mysql"
	"github.com/nutricart/backend/usecase"
	"go.uber.org/zap"
	gormMysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Initialize Zap Structured Logger
	logger.InitLogger()

	logger.Info("═══════════════════════════════════════════════")
	logger.Info("       NUTRICART BACKEND SERVICE STARTED       ")
	logger.Info("               Clean Architecture              ")
	logger.Info("═══════════════════════════════════════════════")

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

	cloudSQLConnection := os.Getenv("CLOUD_SQL_CONNECTION_NAME")

	var dsn string
	if cloudSQLConnection != "" {
		// Standard GCP Cloud SQL UNIX Socket connection format
		socketPath := fmt.Sprintf("/cloudsql/%s", cloudSQLConnection)
		dsn = fmt.Sprintf("%s:%s@unix(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbUser, dbPass, socketPath, dbName,
		)
		logger.Info("Configuring Unix socket DSN for GCP Cloud SQL connection", 
			zap.String("socket_path", socketPath),
			zap.String("database", dbName),
		)
	} else {
		// Traditional TCP Connection (for local testing, direct IPs, or VPN/VPC tunnels)
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbUser, dbPass, dbHost, dbPort, dbName,
		)
		logger.Info("Configuring traditional TCP connection DSN", 
			zap.String("host", dbHost),
			zap.String("port", dbPort),
			zap.String("database", dbName),
		)
	}

	// Since we are running in multiple deployment scenarios, check for local SQLite mock if preferred,
	// but default to robust MySQL with fail-fast check (Senior engineer principles)
	var db *gorm.DB
	var err error

	logger.Info("Connecting to MySQL Database", 
		zap.String("user", dbUser),
		zap.String("host", dbHost),
		zap.String("port", dbPort),
		zap.String("database", dbName),
		zap.String("cloud_sql_connection_name", cloudSQLConnection),
	)

	db, err = gorm.Open(gormMysql.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("❌ GORM DATABASE CONNECTION ERROR: Failed to connect to MySQL backend database",
			zap.Error(err),
			zap.String("user", dbUser),
			zap.String("host", dbHost),
			zap.String("port", dbPort),
			zap.String("database", dbName),
			zap.String("cloud_sql_connection_name", cloudSQLConnection),
			zap.String("recommendation", "Please verify that the DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME environment variables are accurately configured under Cloud Run or Cloud SQL connections."),
		)
		
		// If running in production mode, we MUST fail-fast immediately to prevent running the container in a broken state
		env := os.Getenv("ENV")
		if env == "" {
			env = os.Getenv("NODE_ENV")
		}
		if env == "production" || env == "prod" {
			logger.Fatal("FATAL: Cannot continue server initialization without a healthy database connection in production mode.")
		} else {
			logger.Warn("⚠️ FALLBACK: Falling back without a database connection. Some features may not work as expected.")
		}
	}

	// 2. Auto Migrate Tables (Clean DB Migration schema)
	if db != nil {
		logger.Info("🔄 Running Auto Database Migrations and Seeders...")
		if err := migration.AutoMigrateAndSeed(db); err != nil {
			logger.Fatal("❌ FATAL: Database Auto-migration failed at startup", zap.Error(err))
		}
		logger.Info("✔ Database migration and indexing completed successfully.")
	}

	// 3. Initialize Repositories (SOLID - Depend on Interfaces)
	shoppingItemRepo := mysql.NewShoppingItemRepository(db)
	recipeRepo := mysql.NewRecipeRepository(db)
	familyRepo := mysql.NewFamilyMemberRepository(db)

	// 4. Initialize Use Cases (Domain boundaries)
	jwtSecretStr := os.Getenv("JWT_SECRET")
	if jwtSecretStr == "" {
		logger.Error("❌ SECURITY WARNING: JWT_SECRET environment variable is empty!",
			zap.String("recommendation", "Please configure the JWT_SECRET environment variable in your production configuration immediately to secure API authentication routes."),
		)
		env := os.Getenv("ENV")
		if env == "" {
			env = os.Getenv("NODE_ENV")
		}
		if env == "production" || env == "prod" {
			logger.Fatal("FATAL: Starting without a JWT_SECRET is strictly forbidden in production mode.")
		}
		jwtSecretStr = "temporary-dev-jwt-fallback-key-should-never-be-used-in-production"
	}
	jwtSecret := []byte(jwtSecretStr)
	shoppingItemUC := usecase.NewShoppingItemUsecase(shoppingItemRepo)
	recipeUC := usecase.NewRecipeUsecase(recipeRepo)
	familyUC := usecase.NewFamilyMemberUsecase(familyRepo)
	authUC := usecase.NewAuthUsecase(jwtSecret)

	// 5. Setup Go Fiber Application framework
	app := fiber.New(fiber.Config{
		AppName: "NutriCart API Gateway",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))
	// Use our new structured Zap Logger middleware for comprehensive activity tracing
	app.Use(middleware.ZapLoggerMiddleware())

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
	http.NewFamilyMemberHandler(app, familyUC)

	// 7.5. Serve Static Frontend files (Vite output dir) for fully cohesive deployment single-command
	app.Static("/", "./dist")
	app.Get("*", func(c *fiber.Ctx) error {
		path := c.Path()
		// Make sure backend API paths receive 404 instead of index.html
		if len(path) >= 4 && path[:4] == "/api" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"status":  "error",
				"message": "Resource API tidak ditemukan.",
			})
		}
		return c.SendFile("./dist/index.html")
	})

	// 8. Start Endpoint listener (checks default secure environment config)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Primary Cloud Run default fallback
	}

	logger.Info("🚀 NutriCart API service is starting to listen", zap.String("port", port))
	if err := app.Listen("0.0.0.0:" + port); err != nil {
		logger.Fatal("Fiber server failed to boot on port " + port, zap.Error(err))
	}
}
