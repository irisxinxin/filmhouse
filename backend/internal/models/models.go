package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a customer or admin
type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;size:255;not null" json:"email"`
	Password     string         `gorm:"size:255;not null" json:"-"`
	FirstName    string         `gorm:"size:100" json:"first_name"`
	LastName     string         `gorm:"size:100" json:"last_name"`
	Phone        string         `gorm:"size:20" json:"phone"`
	Role         string         `gorm:"size:20;default:user" json:"role"` // user, admin
	MembershipID *uint          `json:"membership_id"`
	Membership   *Membership    `gorm:"foreignKey:MembershipID" json:"membership,omitempty"`
	Points       int            `gorm:"default:0" json:"points"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// PasswordResetToken for password reset functionality
type PasswordResetToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Token     string    `gorm:"size:100;uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Membership represents membership tiers
type Membership struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Price       float64   `gorm:"type:decimal(10,2);default:0" json:"price"`
	Discount    float64   `gorm:"type:decimal(5,2);default:0" json:"discount"` // percentage
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Program represents a curated collection of films (e.g. "Now Showing", "Coming Soon", "Japanese Film Festival")
type Program struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	ImageURL    string         `gorm:"size:500" json:"image_url"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Films       []Film         `gorm:"many2many:program_films;" json:"films,omitempty"`
}

// ProgramFilm is the join table for Program <-> Film many-to-many
type ProgramFilm struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProgramID uint      `gorm:"not null;index:idx_program_film,unique" json:"program_id"`
	FilmID    uint      `gorm:"not null;index:idx_program_film,unique" json:"film_id"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// Film represents a movie
type Film struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Year        int            `json:"year"`
	Duration    int            `json:"duration"` // in minutes
	Rating      string         `gorm:"size:10" json:"rating"` // PG, M18, R21, etc.
	Genre       string         `gorm:"size:100" json:"genre"`
	Synopsis    string         `gorm:"type:text" json:"synopsis"`
	Director    string         `gorm:"size:255" json:"director"`
	Cast        string         `gorm:"type:text" json:"cast"`
	Language    string         `gorm:"size:100" json:"language"`
	Subtitles   string         `gorm:"size:100" json:"subtitles"`
	PosterURL   string         `gorm:"size:500" json:"poster_url"`
	BannerURL   string         `gorm:"size:500" json:"banner_url"`
	TrailerURL  string         `gorm:"size:500" json:"trailer_url"`
	Awards      string         `gorm:"type:text" json:"awards"`
	Is4K        bool           `gorm:"default:false" json:"is_4k"`
	IsFeatured  bool           `gorm:"default:false" json:"is_featured"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Screenings  []Screening    `gorm:"foreignKey:FilmID" json:"screenings,omitempty"`
	Programs    []Program      `gorm:"many2many:program_films;" json:"programs,omitempty"`
}

// Hall represents a cinema hall/room
type Hall struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Name       string    `gorm:"size:100;not null" json:"name"`
	Capacity   int       `json:"capacity"`
	Is4K       bool      `gorm:"default:false" json:"is_4k"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	SeatLayout string    `gorm:"type:json" json:"seat_layout"` // JSON: defines the visual grid layout
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Seats      []Seat    `gorm:"foreignKey:HallID" json:"seats,omitempty"`
}

// Seat represents a seat in a hall
type Seat struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	HallID    uint      `gorm:"not null;index" json:"hall_id"`
	Hall      *Hall     `gorm:"foreignKey:HallID" json:"hall,omitempty"`
	Row       string    `gorm:"size:5;not null" json:"row"`       // A, B, C, etc.
	Number    int       `gorm:"not null" json:"number"`           // 1, 2, 3, etc.
	SeatType  string    `gorm:"size:20;default:standard" json:"seat_type"` // standard, premium, wheelchair
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TicketType represents different ticket categories (Standard, Member, Student, etc.)
type TicketType struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:50;not null" json:"name"`         // Standard, Member, Student, Senior, Child
	Description string    `gorm:"size:255" json:"description"`          // e.g., "Valid student ID required"
	SortOrder   int       `gorm:"default:0" json:"sort_order"`          // Display order
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ScreeningPrice represents the price for a specific ticket type at a screening
type ScreeningPrice struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	ScreeningID  uint        `gorm:"not null;index:idx_screening_ticket,unique" json:"screening_id"`
	Screening    *Screening  `gorm:"foreignKey:ScreeningID" json:"screening,omitempty"`
	TicketTypeID uint        `gorm:"not null;index:idx_screening_ticket,unique" json:"ticket_type_id"`
	TicketType   *TicketType `gorm:"foreignKey:TicketTypeID" json:"ticket_type,omitempty"`
	Price        float64     `gorm:"type:decimal(10,2);not null" json:"price"`
	IsActive     bool        `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// Screening represents a film showing
type Screening struct {
	ID          uint             `gorm:"primaryKey" json:"id"`
	FilmID      uint             `gorm:"not null;index" json:"film_id"`
	Film        *Film            `gorm:"foreignKey:FilmID" json:"film,omitempty"`
	HallID      uint             `gorm:"not null;index" json:"hall_id"`
	Hall        *Hall            `gorm:"foreignKey:HallID" json:"hall,omitempty"`
	StartTime   time.Time        `gorm:"not null;index" json:"start_time"`
	EndTime     time.Time        `gorm:"not null" json:"end_time"`
	Price       float64          `gorm:"type:decimal(10,2);not null" json:"price"` // Default/base price (kept for backward compat)
	IsActive    bool             `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	DeletedAt   gorm.DeletedAt   `gorm:"index" json:"-"`
	Prices      []ScreeningPrice `gorm:"foreignKey:ScreeningID" json:"prices,omitempty"`
}

// Booking represents a ticket booking
type Booking struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	BookingRef    string         `gorm:"uniqueIndex;size:20;not null" json:"booking_ref"`
	QRCode        string         `gorm:"uniqueIndex;size:64;not null" json:"qr_code"` // unique QR code for ticket validation
	UserID        *uint          `gorm:"index" json:"user_id"`                        // nil for guest bookings
	User          *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ScreeningID   uint           `gorm:"not null;index" json:"screening_id"`
	Screening     *Screening     `gorm:"foreignKey:ScreeningID" json:"screening,omitempty"`
	TotalAmount   float64        `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	Discount      float64        `gorm:"type:decimal(10,2);default:0" json:"discount"`
	FinalAmount   float64        `gorm:"type:decimal(10,2);not null" json:"final_amount"`
	Status        string         `gorm:"size:20;default:pending" json:"status"` // pending, confirmed, cancelled, refunded
	RedeemStatus  string         `gorm:"size:20;default:unused" json:"redeem_status"` // unused, redeemed
	RedeemedAt    *time.Time     `json:"redeemed_at,omitempty"`
	RedeemedBy    *uint          `json:"redeemed_by,omitempty"` // admin user ID who redeemed
	PaymentMethod string         `gorm:"size:50" json:"payment_method"`
	PaymentRef    string         `gorm:"size:100" json:"payment_ref"`
	PointsEarned  int            `gorm:"default:0" json:"points_earned"`
	PointsUsed    int            `gorm:"default:0" json:"points_used"`
	GuestName     string         `gorm:"size:100" json:"guest_name,omitempty"`  // For guest bookings
	GuestEmail    string         `gorm:"size:100" json:"guest_email,omitempty"` // For guest bookings
	GuestPhone    string         `gorm:"size:20" json:"guest_phone,omitempty"`  // For guest bookings
	EmailSent     bool           `gorm:"default:false" json:"email_sent"`
	EmailSentAt   *time.Time     `json:"email_sent_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	Tickets       []Ticket       `gorm:"foreignKey:BookingID" json:"tickets,omitempty"`
}

// Ticket represents a single ticket in a booking
type Ticket struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	BookingID    uint        `gorm:"not null;index" json:"booking_id"`
	Booking      *Booking    `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	SeatID       uint        `gorm:"not null;index" json:"seat_id"`
	Seat         *Seat       `gorm:"foreignKey:SeatID" json:"seat,omitempty"`
	TicketTypeID *uint       `gorm:"index" json:"ticket_type_id,omitempty"`
	TicketType   *TicketType `gorm:"foreignKey:TicketTypeID" json:"ticket_type,omitempty"`
	Price        float64     `gorm:"type:decimal(10,2);not null" json:"price"`
	CreatedAt    time.Time   `json:"created_at"`
}

// SeatLock represents a temporary seat lock during booking
type SeatLock struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ScreeningID uint      `gorm:"not null;index:idx_seat_lock,unique" json:"screening_id"`
	SeatID      uint      `gorm:"not null;index:idx_seat_lock,unique" json:"seat_id"`
	UserID      *uint     `json:"user_id"`                             // nil for guest locks
	SessionID   string    `gorm:"size:64" json:"session_id,omitempty"` // For guest session tracking
	ExpiresAt   time.Time `gorm:"not null;index" json:"expires_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// Event represents special events
type Event struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	ImageURL    string         `gorm:"size:500" json:"image_url"`
	StartDate   time.Time      `json:"start_date"`
	EndDate     time.Time      `json:"end_date"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// GiftShopItem represents items in the gift shop
type GiftShopItem struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Price       float64        `gorm:"type:decimal(10,2);not null" json:"price"`
	ImageURL    string         `gorm:"size:500" json:"image_url"`
	Stock       int            `gorm:"default:0" json:"stock"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
