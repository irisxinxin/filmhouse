package main

import (
	"log"
	"os"

	"filmhouse-backend/internal/config"
	"filmhouse-backend/internal/database"
	"filmhouse-backend/internal/router"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed initial data if needed
	if os.Getenv("SEED_DATA") == "true" {
		if err := database.Seed(db); err != nil {
			log.Printf("Warning: Failed to seed data: %v", err)
		}
	}

	// Setup router
	r := router.Setup(db, cfg)

	// Start server
	log.Printf("Server starting on port %s", cfg.Server.Port)
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
