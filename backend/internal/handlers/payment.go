package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"filmhouse-backend/internal/models"
	"filmhouse-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	db             *gorm.DB
	bookingService *services.BookingService
	emailService   *services.EmailService
}

func NewPaymentHandler(db *gorm.DB) *PaymentHandler {
	// Set Stripe API key
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	if stripe.Key == "" {
		stripe.Key = "sk_test_placeholder" // Will fail gracefully in demo mode
	}
	
	return &PaymentHandler{
		db:             db,
		bookingService: services.NewBookingService(db),
		emailService:   services.NewEmailService(db),
	}
}

// CreateCheckoutSession creates a Stripe checkout session
func (h *PaymentHandler) CreateCheckoutSession(c *gin.Context) {
	var req struct {
		BookingID uint   `json:"booking_id" binding:"required"`
		SuccessURL string `json:"success_url" binding:"required"`
		CancelURL  string `json:"cancel_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var booking models.Booking
	if err := h.db.Preload("Tickets.Seat").
		Preload("Screening.Film").
		Preload("Screening.Hall").
		First(&booking, req.BookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if booking.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Booking is not pending payment"})
		return
	}

	// Build line items
	lineItems := []*stripe.CheckoutSessionLineItemParams{}
	for _, ticket := range booking.Tickets {
		seatLabel := fmt.Sprintf("%s%d", ticket.Seat.Row, ticket.Seat.Number)
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("sgd"),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(fmt.Sprintf("%s - Seat %s", 
						booking.Screening.Film.Title, 
						seatLabel)),
					Description: stripe.String(fmt.Sprintf("%s at %s", 
						booking.Screening.Hall.Name,
						booking.Screening.StartTime.Format("Mon, 2 Jan 2006 3:04 PM"))),
				},
				UnitAmount: stripe.Int64(int64(ticket.Price * 100)), // Convert to cents
			},
			Quantity: stripe.Int64(1),
		})
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card", "paynow"}),
		LineItems:          lineItems,
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(req.SuccessURL + "?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:          stripe.String(req.CancelURL),
		Metadata: map[string]string{
			"booking_id":  fmt.Sprintf("%d", booking.ID),
			"booking_ref": booking.BookingRef,
		},
		ExpiresAt: stripe.Int64(booking.CreatedAt.Add(10 * 60 * 1e9).Unix()), // 10 min expiry
	}

	// Add customer email if available
	if booking.GuestEmail != "" {
		params.CustomerEmail = stripe.String(booking.GuestEmail)
	} else if booking.User != nil && booking.User.Email != "" {
		params.CustomerEmail = stripe.String(booking.User.Email)
	}

	// Check if Stripe is configured BEFORE calling the API
	if stripe.Key == "" || stripe.Key == "sk_test_placeholder" {
		c.JSON(http.StatusOK, gin.H{
			"demo_mode":  true,
			"booking_id": booking.ID,
			"message":    "Stripe not configured. Use demo checkout.",
		})
		return
	}

	s, err := session.New(params)
	if err != nil {
		// If Stripe is misconfigured (bad/expired key), fall back to demo mode
		// so checkout remains usable in test environments.
		if stripeErr, ok := err.(*stripe.Error); ok {
			// Treat auth/permission/config errors as "not configured" and fall back.
			if stripeErr.HTTPStatusCode == http.StatusUnauthorized || stripeErr.HTTPStatusCode == http.StatusForbidden || stripeErr.Code == stripe.ErrorCodeAPIKeyExpired {
				c.JSON(http.StatusOK, gin.H{
					"demo_mode":  true,
					"booking_id": booking.ID,
					"message":    "Stripe is not configured correctly. Use demo checkout.",
				})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":   s.ID,
		"checkout_url": s.URL,
	})
}

// HandleWebhook handles Stripe webhook events
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	
	var event stripe.Event
	if endpointSecret != "" {
		sig := c.GetHeader("Stripe-Signature")
		event, err = webhook.ConstructEvent(payload, sig, endpointSecret)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature"})
			return
		}
	} else {
		// No webhook secret configured, parse directly (dev mode)
		if err := json.Unmarshal(payload, &event); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse webhook"})
			return
		}
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse session"})
			return
		}
		
		bookingID := session.Metadata["booking_id"]
		if bookingID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing booking_id in metadata"})
			return
		}

		var booking models.Booking
		if err := h.db.First(&booking, bookingID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
			return
		}

		// Confirm the booking
		if err := h.bookingService.ConfirmBooking(booking.ID, session.PaymentIntent.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm booking"})
			return
		}

		// Reload and send email
		h.db.Preload("Tickets.Seat").Preload("Screening.Film").Preload("Screening.Hall").Preload("User").
			First(&booking, booking.ID)

		go func() {
			if booking.GuestEmail != "" {
				h.emailService.SendGuestTicketEmail(&booking, booking.GuestEmail, booking.GuestName)
			} else if booking.User != nil {
				h.emailService.SendTicketEmail(&booking)
			}
		}()

	case "checkout.session.expired":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse session"})
			return
		}
		
		bookingID := session.Metadata["booking_id"]
		if bookingID != "" {
			// Cancel the booking
			var booking models.Booking
			if err := h.db.First(&booking, bookingID).Error; err == nil {
				booking.Status = "cancelled"
				h.db.Save(&booking)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// DemoConfirm confirms a booking in demo mode (no real payment)
func (h *PaymentHandler) DemoConfirm(c *gin.Context) {
	var req struct {
		BookingID uint `json:"booking_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var booking models.Booking
	if err := h.db.First(&booking, req.BookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if booking.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Booking is not pending"})
		return
	}

	// Confirm with demo payment ref
	paymentRef := fmt.Sprintf("DEMO-%s", booking.BookingRef)
	if err := h.bookingService.ConfirmBooking(booking.ID, paymentRef); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm booking"})
		return
	}

	// Reload booking
	h.db.Preload("Tickets.Seat").Preload("Screening.Film").Preload("Screening.Hall").Preload("User").
		First(&booking, booking.ID)

	// Send email
	go func() {
		if booking.GuestEmail != "" {
			h.emailService.SendGuestTicketEmail(&booking, booking.GuestEmail, booking.GuestName)
		} else if booking.User != nil {
			h.emailService.SendTicketEmail(&booking)
		}
	}()

	c.JSON(http.StatusOK, booking)
}

// GetPaymentStatus checks the status of a Stripe checkout session
func (h *PaymentHandler) GetPaymentStatus(c *gin.Context) {
	sessionID := c.Param("session_id")

	s, err := session.Get(sessionID, nil)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":         s.Status,
		"payment_status": s.PaymentStatus,
		"booking_id":     s.Metadata["booking_id"],
	})
}
