package database

import (
	"fmt"
	"log"

	"filmhouse-backend/internal/config"
	"filmhouse-backend/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("Running database migrations...")
	
	err := db.AutoMigrate(
		&models.User{},
		&models.PasswordResetToken{},
		&models.Membership{},
		&models.TicketType{},
		&models.Film{},
		&models.Hall{},
		&models.Seat{},
		&models.Screening{},
		&models.ScreeningPrice{},
		&models.Booking{},
		&models.Ticket{},
		&models.SeatLock{},
		&models.Event{},
		&models.GiftShopItem{},
		&models.Program{},
		&models.ProgramFilm{},
	)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	// Seed default ticket types if not exist
	seedTicketTypes(db)

	log.Println("Database migrations completed")
	return nil
}

func seedTicketTypes(db *gorm.DB) {
	ticketTypes := []models.TicketType{
		{ID: 1, Name: "Standard", Description: "Regular admission", SortOrder: 1, IsActive: true},
		{ID: 2, Name: "Member", Description: "Filmhouse members only", SortOrder: 2, IsActive: true},
		{ID: 3, Name: "Student", Description: "Valid student ID required", SortOrder: 3, IsActive: true},
		{ID: 4, Name: "Senior", Description: "60 years and above", SortOrder: 4, IsActive: true},
		{ID: 5, Name: "Child", Description: "Under 12 years old", SortOrder: 5, IsActive: true},
	}

	for _, tt := range ticketTypes {
		db.FirstOrCreate(&tt, models.TicketType{ID: tt.ID})
	}
}
