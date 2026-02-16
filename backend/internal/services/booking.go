package services

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"filmhouse-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BookingService struct {
	db *gorm.DB
}

func NewBookingService(db *gorm.DB) *BookingService {
	return &BookingService{db: db}
}

// LockSeats attempts to lock seats for a user with pessimistic locking
func (s *BookingService) LockSeats(userID, screeningID uint, seatIDs []uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// First, clean up expired locks
		tx.Where("expires_at < ?", time.Now()).Delete(&models.SeatLock{})

		// Check if seats are already locked or booked
		for _, seatID := range seatIDs {
			// Check for existing lock (with row-level lock)
			var existingLock models.SeatLock
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("screening_id = ? AND seat_id = ? AND expires_at > ?", 
					screeningID, seatID, time.Now()).
				First(&existingLock).Error
			
			if err == nil {
				// Check if same user (handle nil pointer for guest locks)
				if existingLock.UserID != nil && *existingLock.UserID != userID {
					return fmt.Errorf("seat %d is already locked by another user", seatID)
				}
				// User already has this seat locked, extend the lock
				existingLock.ExpiresAt = time.Now().Add(10 * time.Minute)
				tx.Save(&existingLock)
				continue
			}

			// Check if seat is already booked for this screening
			var existingTicket models.Ticket
			err = tx.Joins("JOIN bookings ON bookings.id = tickets.booking_id").
				Where("tickets.seat_id = ? AND bookings.screening_id = ? AND bookings.status IN ?",
					seatID, screeningID, []string{"pending", "confirmed"}).
				First(&existingTicket).Error
			
			if err == nil {
				return fmt.Errorf("seat %d is already booked", seatID)
			}

			// Create new lock
			var userIDPtr *uint
			if userID > 0 {
				userIDPtr = &userID
			}
			lock := models.SeatLock{
				ScreeningID: screeningID,
				SeatID:      seatID,
				UserID:      userIDPtr,
				ExpiresAt:   time.Now().Add(10 * time.Minute),
			}
			if err := tx.Create(&lock).Error; err != nil {
				return fmt.Errorf("failed to lock seat %d: %w", seatID, err)
			}
		}

		return nil
	})
}

// ReleaseLocks releases all locks for a user on a screening
func (s *BookingService) ReleaseLocks(userID, screeningID uint) error {
	return s.db.Where("user_id = ? AND screening_id = ?", userID, screeningID).
		Delete(&models.SeatLock{}).Error
}

// CreateBooking creates a booking with proper transaction handling
func (s *BookingService) CreateBooking(userID, screeningID uint, seatIDs []uint, paymentMethod string) (*models.Booking, error) {
	var booking *models.Booking

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Lock the screening row to prevent race conditions
		var screening models.Screening
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Film").Preload("Hall").
			First(&screening, screeningID).Error; err != nil {
			return fmt.Errorf("screening not found: %w", err)
		}

		// Verify all seats are still locked by this user
		for _, seatID := range seatIDs {
			var lock models.SeatLock
			err := tx.Where("screening_id = ? AND seat_id = ? AND user_id = ? AND expires_at > ?",
				screeningID, seatID, userID, time.Now()).First(&lock).Error
			if err != nil {
				return fmt.Errorf("seat %d lock expired or not found", seatID)
			}
		}

		// Double-check seats are not already booked
		for _, seatID := range seatIDs {
			var count int64
			tx.Model(&models.Ticket{}).
				Joins("JOIN bookings ON bookings.id = tickets.booking_id").
				Where("tickets.seat_id = ? AND bookings.screening_id = ? AND bookings.status IN ?",
					seatID, screeningID, []string{"pending", "confirmed"}).
				Count(&count)
			if count > 0 {
				return fmt.Errorf("seat %d was booked by another user", seatID)
			}
		}

		// Get user for membership discount
		var user models.User
		if err := tx.Preload("Membership").First(&user, userID).Error; err != nil {
			return fmt.Errorf("user not found: %w", err)
		}

		// Calculate pricing
		totalAmount := screening.Price * float64(len(seatIDs))
		discount := 0.0
		if user.Membership != nil && user.Membership.Discount > 0 {
			discount = totalAmount * (user.Membership.Discount / 100)
		}
		finalAmount := totalAmount - discount

		// Generate booking reference and QR code
		bookingRef := generateBookingRef()
		qrCode := generateQRCode(bookingRef, userID, screeningID)

		// Create booking
		booking = &models.Booking{
			BookingRef:    bookingRef,
			QRCode:        qrCode,
			UserID:        &userID,
			ScreeningID:   screeningID,
			TotalAmount:   totalAmount,
			Discount:      discount,
			FinalAmount:   finalAmount,
			Status:        "pending",
			RedeemStatus:  "unused",
			PaymentMethod: paymentMethod,
			PointsEarned:  int(finalAmount), // 1 point per dollar
		}

		if err := tx.Create(booking).Error; err != nil {
			return fmt.Errorf("failed to create booking: %w", err)
		}

		// Create tickets
		for _, seatID := range seatIDs {
			ticket := models.Ticket{
				BookingID: booking.ID,
				SeatID:    seatID,
				Price:     screening.Price,
			}
			if err := tx.Create(&ticket).Error; err != nil {
				return fmt.Errorf("failed to create ticket: %w", err)
			}
		}

		// Release the locks
		tx.Where("user_id = ? AND screening_id = ?", userID, screeningID).
			Delete(&models.SeatLock{})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Load related data
	s.db.Preload("Tickets.Seat").Preload("Screening.Film").Preload("Screening.Hall").
		First(booking, booking.ID)

	return booking, nil
}

// ConfirmBooking confirms a booking after payment
func (s *BookingService) ConfirmBooking(bookingID uint, paymentRef string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var booking models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&booking, bookingID).Error; err != nil {
			return err
		}

		if booking.Status != "pending" {
			return errors.New("booking is not in pending status")
		}

		booking.Status = "confirmed"
		booking.PaymentRef = paymentRef

		if err := tx.Save(&booking).Error; err != nil {
			return err
		}

		// Add points to user
		tx.Model(&models.User{}).Where("id = ?", booking.UserID).
			Update("points", gorm.Expr("points + ?", booking.PointsEarned))

		return nil
	})
}

// CancelBooking cancels a booking
func (s *BookingService) CancelBooking(bookingID, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var booking models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&booking, bookingID).Error; err != nil {
			return err
		}

		if booking.UserID == nil || *booking.UserID != userID {
			return errors.New("unauthorized")
		}

		if booking.Status == "cancelled" || booking.Status == "refunded" {
			return errors.New("booking is already cancelled")
		}

		booking.Status = "cancelled"
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}

		// Remove points if booking was confirmed
		if booking.PointsEarned > 0 {
			tx.Model(&models.User{}).Where("id = ?", booking.UserID).
				Update("points", gorm.Expr("GREATEST(points - ?, 0)", booking.PointsEarned))
		}

		return nil
	})
}

// GetAvailableSeats returns available seats for a screening
func (s *BookingService) GetAvailableSeats(screeningID uint) ([]models.Seat, []uint, []uint, error) {
	var screening models.Screening
	if err := s.db.Preload("Hall.Seats").First(&screening, screeningID).Error; err != nil {
		return nil, nil, nil, err
	}

	// Get booked seat IDs
	var bookedSeatIDs []uint
	s.db.Model(&models.Ticket{}).
		Select("tickets.seat_id").
		Joins("JOIN bookings ON bookings.id = tickets.booking_id").
		Where("bookings.screening_id = ? AND bookings.status IN ?",
			screeningID, []string{"pending", "confirmed"}).
		Pluck("seat_id", &bookedSeatIDs)

	// Get locked seat IDs (excluding expired)
	var lockedSeatIDs []uint
	s.db.Model(&models.SeatLock{}).
		Select("seat_id").
		Where("screening_id = ? AND expires_at > ?", screeningID, time.Now()).
		Pluck("seat_id", &lockedSeatIDs)

	return screening.Hall.Seats, bookedSeatIDs, lockedSeatIDs, nil
}

func generateBookingRef() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return "FH" + string(b)
}

// generateQRCode creates a unique, secure QR code for ticket validation
func generateQRCode(bookingRef string, userID, screeningID uint) string {
	data := fmt.Sprintf("%s-%d-%d-%d", bookingRef, userID, screeningID, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// ValidateTicket validates a QR code and returns booking info (does not redeem)
func (s *BookingService) ValidateTicket(qrCode string) (*models.Booking, error) {
	var booking models.Booking
	err := s.db.Preload("Tickets.Seat").
		Preload("Screening.Film").
		Preload("Screening.Hall").
		Preload("User").
		Where("qr_code = ?", qrCode).
		First(&booking).Error
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid QR code")
		}
		return nil, err
	}

	return &booking, nil
}

// RedeemTicket marks a ticket as used (for entry)
func (s *BookingService) RedeemTicket(qrCode string, adminUserID uint) (*models.Booking, error) {
	var booking models.Booking
	
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Tickets.Seat").
			Preload("Screening.Film").
			Preload("Screening.Hall").
			Preload("User").
			Where("qr_code = ?", qrCode).
			First(&booking).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("invalid QR code")
			}
			return err
		}

		// Check booking status
		if booking.Status != "confirmed" {
			return fmt.Errorf("booking is not confirmed (status: %s)", booking.Status)
		}

		// Check if already redeemed
		if booking.RedeemStatus == "redeemed" {
			return fmt.Errorf("ticket already redeemed at %s", booking.RedeemedAt.Format("2006-01-02 15:04"))
		}

		// Mark as redeemed
		now := time.Now()
		booking.RedeemStatus = "redeemed"
		booking.RedeemedAt = &now
		booking.RedeemedBy = &adminUserID

		return tx.Save(&booking).Error
	})

	if err != nil {
		return nil, err
	}

	return &booking, nil
}

// GetBookingByQR returns booking by QR code (for ticket display)
func (s *BookingService) GetBookingByQR(qrCode string) (*models.Booking, error) {
	var booking models.Booking
	err := s.db.Preload("Tickets.Seat").
		Preload("Screening.Film").
		Preload("Screening.Hall").
		Preload("User").
		Where("qr_code = ?", qrCode).
		First(&booking).Error
	
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

// TicketSelection represents a seat with its ticket type
type TicketSelection struct {
	SeatID       uint `json:"seat_id"`
	TicketTypeID uint `json:"ticket_type_id"`
}

// MultiScreeningTicket represents a ticket for multi-screening bookings
type MultiScreeningTicket struct {
	ScreeningID  uint `json:"screening_id"`
	SeatID       uint `json:"seat_id"`
	TicketTypeID uint `json:"ticket_type_id"`
}

// CreateGuestBooking creates a booking for guest users (no user account)
func (s *BookingService) CreateGuestBooking(screeningID uint, seatIDs []uint, paymentMethod, guestName, guestEmail, guestPhone string) (*models.Booking, error) {
	// Convert to TicketSelection with default ticket type (Standard = 1)
	selections := make([]TicketSelection, len(seatIDs))
	for i, seatID := range seatIDs {
		selections[i] = TicketSelection{SeatID: seatID, TicketTypeID: 1}
	}
	return s.CreateGuestBookingWithPrices(screeningID, selections, paymentMethod, guestName, guestEmail, guestPhone)
}

// CreateGuestBookingWithPrices creates a booking with specific ticket types per seat
func (s *BookingService) CreateGuestBookingWithPrices(screeningID uint, selections []TicketSelection, paymentMethod, guestName, guestEmail, guestPhone string) (*models.Booking, error) {
	var booking *models.Booking

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Lock the screening row to prevent race conditions
		var screening models.Screening
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Film").Preload("Hall").Preload("Prices.TicketType").
			First(&screening, screeningID).Error; err != nil {
			return fmt.Errorf("screening not found: %w", err)
		}

		// Build price map from screening prices
		priceMap := make(map[uint]float64)
		for _, sp := range screening.Prices {
			if sp.IsActive {
				priceMap[sp.TicketTypeID] = sp.Price
			}
		}

		// Check seats are not already booked
		for _, sel := range selections {
			var count int64
			tx.Model(&models.Ticket{}).
				Joins("JOIN bookings ON bookings.id = tickets.booking_id").
				Where("tickets.seat_id = ? AND bookings.screening_id = ? AND bookings.status IN ?",
					sel.SeatID, screeningID, []string{"pending", "confirmed"}).
				Count(&count)
			if count > 0 {
				return fmt.Errorf("seat %d is already booked", sel.SeatID)
			}
		}

		// Calculate pricing with ticket types
		var totalAmount float64
		for _, sel := range selections {
			price, ok := priceMap[sel.TicketTypeID]
			if !ok {
				// Fall back to base screening price if ticket type not configured
				price = screening.Price
			}
			totalAmount += price
		}

		// Generate booking reference and QR code
		bookingRef := generateBookingRef()
		qrCode := generateQRCode(bookingRef, 0, screeningID)

		// Create booking (no user ID for guest)
		booking = &models.Booking{
			BookingRef:    bookingRef,
			QRCode:        qrCode,
			UserID:        nil, // Guest booking
			ScreeningID:   screeningID,
			TotalAmount:   totalAmount,
			Discount:      0,
			FinalAmount:   totalAmount,
			Status:        "pending",
			RedeemStatus:  "unused",
			PaymentMethod: paymentMethod,
			PointsEarned:  0, // No points for guests
			GuestName:     guestName,
			GuestEmail:    guestEmail,
			GuestPhone:    guestPhone,
		}

		if err := tx.Create(booking).Error; err != nil {
			return fmt.Errorf("failed to create booking: %w", err)
		}

		// Create tickets with ticket types
		for _, sel := range selections {
			price, ok := priceMap[sel.TicketTypeID]
			if !ok {
				price = screening.Price
			}
			ticket := models.Ticket{
				BookingID:    booking.ID,
				SeatID:       sel.SeatID,
				TicketTypeID: &sel.TicketTypeID,
				Price:        price,
			}
			if err := tx.Create(&ticket).Error; err != nil {
				return fmt.Errorf("failed to create ticket: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Load related data
	s.db.Preload("Tickets.Seat").Preload("Tickets.TicketType").
		Preload("Screening.Film").Preload("Screening.Hall").
		First(booking, booking.ID)

	return booking, nil
}

// CreateMultiScreeningGuestBooking creates bookings for multiple screenings in one transaction
// Returns a slice of bookings (one per screening) that share the same booking reference prefix
func (s *BookingService) CreateMultiScreeningGuestBooking(tickets []MultiScreeningTicket, paymentMethod, guestName, guestEmail, guestPhone string) ([]*models.Booking, error) {
	if len(tickets) == 0 {
		return nil, errors.New("no tickets provided")
	}

	// Group tickets by screening
	screeningTickets := make(map[uint][]MultiScreeningTicket)
	for _, t := range tickets {
		screeningTickets[t.ScreeningID] = append(screeningTickets[t.ScreeningID], t)
	}

	var bookings []*models.Booking
	baseRef := generateBookingRef()

	err := s.db.Transaction(func(tx *gorm.DB) error {
		bookingIndex := 0
		for screeningID, screeningTix := range screeningTickets {
			// Lock the screening row
			var screening models.Screening
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Preload("Film").Preload("Hall").Preload("Prices.TicketType").
				First(&screening, screeningID).Error; err != nil {
				return fmt.Errorf("screening %d not found: %w", screeningID, err)
			}

			// Build price map
			priceMap := make(map[uint]float64)
			for _, sp := range screening.Prices {
				if sp.IsActive {
					priceMap[sp.TicketTypeID] = sp.Price
				}
			}

			// Check seats availability
			for _, t := range screeningTix {
				var count int64
				tx.Model(&models.Ticket{}).
					Joins("JOIN bookings ON bookings.id = tickets.booking_id").
					Where("tickets.seat_id = ? AND bookings.screening_id = ? AND bookings.status IN ?",
						t.SeatID, screeningID, []string{"pending", "confirmed"}).
					Count(&count)
				if count > 0 {
					return fmt.Errorf("seat %d is already booked for screening %d", t.SeatID, screeningID)
				}
			}

			// Calculate total for this screening
			var totalAmount float64
			for _, t := range screeningTix {
				price, ok := priceMap[t.TicketTypeID]
				if !ok {
					price = screening.Price
				}
				totalAmount += price
			}

			// Generate booking ref (add suffix for multiple screenings)
			bookingRef := baseRef
			if len(screeningTickets) > 1 {
				bookingRef = fmt.Sprintf("%s-%d", baseRef, bookingIndex+1)
			}
			qrCode := generateQRCode(bookingRef, 0, screeningID)

			booking := &models.Booking{
				BookingRef:    bookingRef,
				QRCode:        qrCode,
				UserID:        nil,
				ScreeningID:   screeningID,
				TotalAmount:   totalAmount,
				Discount:      0,
				FinalAmount:   totalAmount,
				Status:        "pending",
				RedeemStatus:  "unused",
				PaymentMethod: paymentMethod,
				PointsEarned:  0,
				GuestName:     guestName,
				GuestEmail:    guestEmail,
				GuestPhone:    guestPhone,
			}

			if err := tx.Create(booking).Error; err != nil {
				return fmt.Errorf("failed to create booking: %w", err)
			}

			// Create tickets
			for _, t := range screeningTix {
				price, ok := priceMap[t.TicketTypeID]
				if !ok {
					price = screening.Price
				}
				ticket := models.Ticket{
					BookingID:    booking.ID,
					SeatID:       t.SeatID,
					TicketTypeID: &t.TicketTypeID,
					Price:        price,
				}
				if err := tx.Create(&ticket).Error; err != nil {
					return fmt.Errorf("failed to create ticket: %w", err)
				}
			}

			bookings = append(bookings, booking)
			bookingIndex++
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Load related data for all bookings
	for i, b := range bookings {
		s.db.Preload("Tickets.Seat").Preload("Tickets.TicketType").
			Preload("Screening.Film").Preload("Screening.Hall").
			First(bookings[i], b.ID)
	}

	return bookings, nil
}
