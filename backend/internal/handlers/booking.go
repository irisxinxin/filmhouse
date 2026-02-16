package handlers

import (
	"net/http"

	"filmhouse-backend/internal/models"
	"filmhouse-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BookingHandler struct {
	db           *gorm.DB
	service      *services.BookingService
	emailService *services.EmailService
}

func NewBookingHandler(db *gorm.DB) *BookingHandler {
	return &BookingHandler{
		db:           db,
		service:      services.NewBookingService(db),
		emailService: services.NewEmailService(db),
	}
}

// GetSeats returns seat availability for a screening
func (h *BookingHandler) GetSeats(c *gin.Context) {
	screeningID := c.Param("id")
	
	var screening models.Screening
	if err := h.db.Preload("Film").Preload("Hall").
		First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	seats, bookedIDs, lockedIDs, err := h.service.GetAvailableSeats(screening.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get seats"})
		return
	}

	// Build seat map
	bookedMap := make(map[uint]bool)
	for _, id := range bookedIDs {
		bookedMap[id] = true
	}
	lockedMap := make(map[uint]bool)
	for _, id := range lockedIDs {
		lockedMap[id] = true
	}

	type SeatInfo struct {
		models.Seat
		Status string `json:"status"` // available, booked, locked
	}

	seatInfos := make([]SeatInfo, len(seats))
	for i, seat := range seats {
		status := "available"
		if bookedMap[seat.ID] {
			status = "booked"
		} else if lockedMap[seat.ID] {
			status = "locked"
		}
		seatInfos[i] = SeatInfo{Seat: seat, Status: status}
	}

	c.JSON(http.StatusOK, gin.H{
		"screening": screening,
		"seats":     seatInfos,
	})
}

// LockSeats locks seats for a user
func (h *BookingHandler) LockSeats(c *gin.Context) {
	userID := c.GetUint("user_id")
	screeningID := c.Param("screening_id")

	var req struct {
		SeatIDs []uint `json:"seat_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	if err := h.service.LockSeats(userID, screening.ID, req.SeatIDs); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Seats locked successfully"})
}

// GuestLockSeats locks seats for a guest user (using session ID)
func (h *BookingHandler) GuestLockSeats(c *gin.Context) {
	screeningID := c.Param("screening_id")

	var req struct {
		SeatIDs   []uint `json:"seat_ids" binding:"required"`
		SessionID string `json:"session_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	// Use 0 as user_id for guest locks
	if err := h.service.LockSeats(0, screening.ID, req.SeatIDs); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Seats locked successfully"})
}

// ReleaseLocks releases all locks for a user on a screening
func (h *BookingHandler) ReleaseLocks(c *gin.Context) {
	userID := c.GetUint("user_id")
	screeningID := c.Param("screening_id")

	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	if err := h.service.ReleaseLocks(userID, screening.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to release locks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Locks released"})
}

// CreateBooking creates a new booking
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	userID := c.GetUint("user_id")
	screeningID := c.Param("screening_id")

	var req struct {
		SeatIDs       []uint `json:"seat_ids" binding:"required"`
		PaymentMethod string `json:"payment_method" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	booking, err := h.service.CreateBooking(userID, screening.ID, req.SeatIDs, req.PaymentMethod)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

// ConfirmBooking confirms a booking after payment
func (h *BookingHandler) ConfirmBooking(c *gin.Context) {
	bookingID := c.Param("id")

	var req struct {
		PaymentRef string `json:"payment_ref" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var booking models.Booking
	if err := h.db.First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if err := h.service.ConfirmBooking(booking.ID, req.PaymentRef); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("Tickets.Seat").Preload("Screening.Film").Preload("Screening.Hall").Preload("User").
		First(&booking, booking.ID)

	// Send ticket email asynchronously
	go func() {
		if err := h.emailService.SendTicketEmail(&booking); err != nil {
			// Log error but don't fail the booking
			println("[EMAIL ERROR]", err.Error())
		}
	}()

	c.JSON(http.StatusOK, booking)
}

// CancelBooking cancels a booking
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	userID := c.GetUint("user_id")
	bookingID := c.Param("id")

	var booking models.Booking
	if err := h.db.First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if err := h.service.CancelBooking(booking.ID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled"})
}

// GetUserBookings returns all bookings for the current user
func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	userID := c.GetUint("user_id")

	var bookings []models.Booking
	if err := h.db.Preload("Tickets.Seat").
		Preload("Screening.Film").Preload("Screening.Hall").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookings"})
		return
	}

	c.JSON(http.StatusOK, bookings)
}

// GetBooking returns a single booking
func (h *BookingHandler) GetBooking(c *gin.Context) {
	userID := c.GetUint("user_id")
	role := c.GetString("role")
	bookingID := c.Param("id")

	var booking models.Booking
	query := h.db.Preload("Tickets.Seat").
		Preload("Screening.Film").Preload("Screening.Hall").
		Preload("User")

	if role != "admin" {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// Admin handlers

func (h *BookingHandler) AdminList(c *gin.Context) {
	var bookings []models.Booking
	query := h.db.Preload("Tickets.Seat").
		Preload("Screening.Film").Preload("Screening.Hall").
		Preload("User")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by screening
	if screeningID := c.Query("screening_id"); screeningID != "" {
		query = query.Where("screening_id = ?", screeningID)
	}

	if err := query.Order("created_at DESC").Limit(100).Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookings"})
		return
	}

	c.JSON(http.StatusOK, bookings)
}

func (h *BookingHandler) AdminUpdateStatus(c *gin.Context) {
	bookingID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var booking models.Booking
	if err := h.db.First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	booking.Status = req.Status
	if err := h.db.Save(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update booking"})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// ValidateTicket validates a QR code without redeeming (preview)
func (h *BookingHandler) ValidateTicket(c *gin.Context) {
	var req struct {
		QRCode string `json:"qr_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking, err := h.service.ValidateTicket(req.QRCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "valid": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"booking": booking,
	})
}

// RedeemTicket marks a ticket as used for entry
func (h *BookingHandler) RedeemTicket(c *gin.Context) {
	adminUserID := c.GetUint("user_id")

	var req struct {
		QRCode string `json:"qr_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking, err := h.service.RedeemTicket(req.QRCode, adminUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "redeemed": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"redeemed": true,
		"message":  "Ticket successfully redeemed",
		"booking":  booking,
	})
}

// ResendTicketEmail resends the ticket email
func (h *BookingHandler) ResendTicketEmail(c *gin.Context) {
	bookingID := c.Param("id")

	var booking models.Booking
	if err := h.db.Preload("Tickets.Seat").
		Preload("Screening.Film").
		Preload("Screening.Hall").
		Preload("User").
		First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if booking.Status != "confirmed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only send email for confirmed bookings"})
		return
	}

	if err := h.emailService.SendTicketEmail(&booking); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email sent successfully"})
}

// GetTicketByQR returns ticket info by QR code (for public ticket display)
func (h *BookingHandler) GetTicketByQR(c *gin.Context) {
	qrCode := c.Param("qr_code")

	booking, err := h.service.GetBookingByQR(qrCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// ValidateCartSeats validates if seats in cart are still available
func (h *BookingHandler) ValidateCartSeats(c *gin.Context) {
	var req struct {
		Items []struct {
			ScreeningID uint   `json:"screening_id" binding:"required"`
			SeatID      uint   `json:"seat_id" binding:"required"`
			SeatLabel   string `json:"seat_label"`
			FilmTitle   string `json:"film_title"`
		} `json:"items" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	type InvalidSeat struct {
		ScreeningID uint   `json:"screening_id"`
		SeatID      uint   `json:"seat_id"`
		SeatLabel   string `json:"seat_label"`
		FilmTitle   string `json:"film_title"`
		Reason      string `json:"reason"`
	}

	var invalidSeats []InvalidSeat

	for _, item := range req.Items {
		// Check if seat is already booked
		var count int64
		h.db.Model(&models.Ticket{}).
			Joins("JOIN bookings ON bookings.id = tickets.booking_id").
			Where("tickets.seat_id = ? AND bookings.screening_id = ? AND bookings.status IN ?",
				item.SeatID, item.ScreeningID, []string{"pending", "confirmed"}).
			Count(&count)

		if count > 0 {
			invalidSeats = append(invalidSeats, InvalidSeat{
				ScreeningID: item.ScreeningID,
				SeatID:      item.SeatID,
				SeatLabel:   item.SeatLabel,
				FilmTitle:   item.FilmTitle,
				Reason:      "This seat has been purchased by another customer",
			})
		}
	}

	if len(invalidSeats) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"valid":         false,
			"invalid_seats": invalidSeats,
			"message":       "Some seats in your cart are no longer available",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"message": "All seats are available",
	})
}

// GetBookingByRef returns booking info by booking reference (public API for confirmation page)
func (h *BookingHandler) GetBookingByRef(c *gin.Context) {
	bookingRef := c.Param("ref")

	var booking models.Booking
	if err := h.db.Preload("Screening.Film").Preload("Screening.Hall").Preload("Tickets.Seat").
		Where("booking_ref = ?", bookingRef).First(&booking).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// CreateGuestBooking creates a booking for guest users (no auth required)
func (h *BookingHandler) CreateGuestBooking(c *gin.Context) {
	screeningID := c.Param("screening_id")

	var req struct {
		SeatIDs       []uint `json:"seat_ids"`                            // Legacy: simple seat list
		Tickets       []struct {                                          // New: seats with ticket types
			SeatID       uint `json:"seat_id" binding:"required"`
			TicketTypeID uint `json:"ticket_type_id" binding:"required"`
		} `json:"tickets"`
		PaymentMethod string `json:"payment_method" binding:"required"`
		GuestName     string `json:"guest_name" binding:"required"`
		GuestEmail    string `json:"guest_email" binding:"required,email"`
		GuestPhone    string `json:"guest_phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	var booking *models.Booking
	var err error

	// Support both legacy (seat_ids) and new (tickets with types) format
	if len(req.Tickets) > 0 {
		// New format with ticket types
		selections := make([]services.TicketSelection, len(req.Tickets))
		for i, t := range req.Tickets {
			selections[i] = services.TicketSelection{
				SeatID:       t.SeatID,
				TicketTypeID: t.TicketTypeID,
			}
		}
		booking, err = h.service.CreateGuestBookingWithPrices(
			screening.ID,
			selections,
			req.PaymentMethod,
			req.GuestName,
			req.GuestEmail,
			req.GuestPhone,
		)
	} else if len(req.SeatIDs) > 0 {
		// Legacy format - use default Standard ticket type
		booking, err = h.service.CreateGuestBooking(
			screening.ID,
			req.SeatIDs,
			req.PaymentMethod,
			req.GuestName,
			req.GuestEmail,
			req.GuestPhone,
		)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either seat_ids or tickets must be provided"})
		return
	}

	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Auto-confirm guest bookings (demo mode)
	if err := h.service.ConfirmBooking(booking.ID, "GUEST-DEMO-"+booking.BookingRef); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm booking"})
		return
	}

	// Reload booking with all relations
	h.db.Preload("Tickets.Seat").Preload("Tickets.TicketType").
		Preload("Screening.Film").Preload("Screening.Hall").
		First(booking, booking.ID)

	// Send ticket email asynchronously
	go func() {
		if err := h.emailService.SendGuestTicketEmail(booking, req.GuestEmail, req.GuestName); err != nil {
			println("[EMAIL ERROR]", err.Error())
		}
	}()

	c.JSON(http.StatusCreated, booking)
}

// CreateMultiScreeningGuestBooking creates bookings for multiple screenings at once
func (h *BookingHandler) CreateMultiScreeningGuestBooking(c *gin.Context) {
	var req struct {
		Tickets []struct {
			ScreeningID  uint `json:"screening_id" binding:"required"`
			SeatID       uint `json:"seat_id" binding:"required"`
			TicketTypeID uint `json:"ticket_type_id" binding:"required"`
		} `json:"tickets" binding:"required,min=1"`
		PaymentMethod string `json:"payment_method" binding:"required"`
		GuestName     string `json:"guest_name" binding:"required"`
		GuestEmail    string `json:"guest_email" binding:"required,email"`
		GuestPhone    string `json:"guest_phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to service type
	tickets := make([]services.MultiScreeningTicket, len(req.Tickets))
	for i, t := range req.Tickets {
		tickets[i] = services.MultiScreeningTicket{
			ScreeningID:  t.ScreeningID,
			SeatID:       t.SeatID,
			TicketTypeID: t.TicketTypeID,
		}
	}

	bookings, err := h.service.CreateMultiScreeningGuestBooking(
		tickets,
		req.PaymentMethod,
		req.GuestName,
		req.GuestEmail,
		req.GuestPhone,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Auto-confirm all bookings (demo mode)
	for _, booking := range bookings {
		if err := h.service.ConfirmBooking(booking.ID, "GUEST-DEMO-"+booking.BookingRef); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm booking"})
			return
		}
	}

	// Reload bookings with all relations
	for i, b := range bookings {
		h.db.Preload("Tickets.Seat").Preload("Tickets.TicketType").
			Preload("Screening.Film").Preload("Screening.Hall").
			First(bookings[i], b.ID)
	}

	// Send ticket emails asynchronously
	go func() {
		if err := h.emailService.SendMultiScreeningGuestTicketEmail(bookings, req.GuestEmail, req.GuestName); err != nil {
			println("[EMAIL ERROR]", err.Error())
		}
	}()

	// Calculate total across all bookings
	var totalAmount float64
	for _, b := range bookings {
		totalAmount += b.FinalAmount
	}

	c.JSON(http.StatusCreated, gin.H{
		"bookings":     bookings,
		"total_amount": totalAmount,
		"ticket_count": len(req.Tickets),
	})
}
