package router

import (
	"os"
	"strings"
	"time"

	"filmhouse-backend/internal/config"
	"filmhouse-backend/internal/handlers"
	"filmhouse-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	// CORS - support both local and production origins
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}
	
	// Add production origins from environment
	if prodOrigins := os.Getenv("CORS_ORIGINS"); prodOrigins != "" {
		for _, origin := range strings.Split(prodOrigins, ",") {
			allowedOrigins = append(allowedOrigins, strings.TrimSpace(origin))
		}
	}
	
	// Add Vercel preview URLs pattern
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Allow Vercel preview deployments
			if strings.HasSuffix(origin, ".vercel.app") {
				return true
			}
			// Allow filmhousesg.xyz domain (with or without www)
			if origin == "https://filmhousesg.xyz" || origin == "https://www.filmhousesg.xyz" {
				return true
			}
			// Check if origin is in allowed list
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Cache uploaded assets aggressively (posters/banners are content-addressed-ish via random suffixes)
	r.Use(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/uploads/") {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}
		c.Next()
	})

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	filmHandler := handlers.NewFilmHandler(db)
	screeningHandler := handlers.NewScreeningHandler(db)
	bookingHandler := handlers.NewBookingHandler(db)
	hallHandler := handlers.NewHallHandler(db)
	paymentHandler := handlers.NewPaymentHandler(db)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.GET("/validate-reset-token", authHandler.ValidateResetToken)
			auth.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
			auth.PUT("/profile", middleware.AuthMiddleware(cfg), authHandler.UpdateProfile)
		}

		// Public film routes
		films := api.Group("/films")
		{
			films.GET("", filmHandler.List)
			films.GET("/featured", filmHandler.Featured)
			films.GET("/:id", filmHandler.Get)
			films.GET("/:id/screenings", filmHandler.GetScreenings)
		}

		// Public screening routes
		screenings := api.Group("/screenings")
		{
			screenings.GET("", screeningHandler.List)
			screenings.GET("/date/:date", screeningHandler.GetByDate)
		}
		// Separate route for single screening to avoid conflict
		api.GET("/screening/:id", screeningHandler.Get)
		api.GET("/screening/:id/seats", bookingHandler.GetSeats)
		api.GET("/screening/:id/prices", screeningHandler.GetScreeningPrices)

		// Public ticket types
		api.GET("/ticket-types", screeningHandler.GetTicketTypes)

		// Public hall routes
		halls := api.Group("/halls")
		{
			halls.GET("", hallHandler.List)
			halls.GET("/:id", hallHandler.Get)
		}

		// Public booking lookup by reference (for confirmation page) - MUST be before /bookings group
		api.GET("/booking/ref/:ref", bookingHandler.GetBookingByRef)

		// Protected booking routes
		bookings := api.Group("/bookings")
		bookings.Use(middleware.AuthMiddleware(cfg))
		{
			bookings.GET("", bookingHandler.GetUserBookings)
			bookings.GET("/:id", bookingHandler.GetBooking)
			bookings.POST("/screenings/:screening_id/lock", bookingHandler.LockSeats)
			bookings.DELETE("/screenings/:screening_id/lock", bookingHandler.ReleaseLocks)
			bookings.POST("/screenings/:screening_id", bookingHandler.CreateBooking)
			bookings.POST("/:id/confirm", bookingHandler.ConfirmBooking)
			bookings.POST("/:id/cancel", bookingHandler.CancelBooking)
		}

		// Public ticket lookup by QR code
		api.GET("/ticket/:qr_code", bookingHandler.GetTicketByQR)

		// Guest booking (no auth required)
		api.POST("/guest/lock/:screening_id", bookingHandler.GuestLockSeats)
		api.POST("/bookings/guest/screenings/:screening_id", bookingHandler.CreateGuestBooking)
		api.POST("/bookings/guest/multi", bookingHandler.CreateMultiScreeningGuestBooking)
		api.POST("/bookings/validate-cart", bookingHandler.ValidateCartSeats)

		// Payment routes
		payment := api.Group("/payment")
		{
			payment.POST("/create-checkout-session", paymentHandler.CreateCheckoutSession)
			payment.POST("/demo-confirm", paymentHandler.DemoConfirm)
			payment.GET("/status/:session_id", paymentHandler.GetPaymentStatus)
		}
		// Stripe webhook (no auth)
		api.POST("/webhook/stripe", paymentHandler.HandleWebhook)

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg), middleware.AdminMiddleware())
		{
			// Film management
			admin.GET("/films", filmHandler.AdminList)
			admin.POST("/films", filmHandler.Create)
			admin.PUT("/films/:id", filmHandler.Update)
			admin.DELETE("/films/:id", filmHandler.Delete)
			admin.POST("/films/:id/poster", filmHandler.UploadPoster)
			admin.POST("/films/:id/banner", filmHandler.UploadBanner)

			// Screening management
			admin.GET("/screenings", screeningHandler.AdminList)
			admin.POST("/screenings", screeningHandler.Create)
			admin.PUT("/screenings/:id", screeningHandler.Update)
			admin.DELETE("/screenings/:id", screeningHandler.Delete)
			admin.PUT("/screenings/:id/prices", screeningHandler.SetScreeningPrices)
			admin.POST("/screenings/bulk-prices", screeningHandler.BulkSetPrices)

			// Ticket type management
			admin.GET("/ticket-types", screeningHandler.GetTicketTypes)
			admin.POST("/ticket-types", screeningHandler.CreateTicketType)
			admin.PUT("/ticket-types/:id", screeningHandler.UpdateTicketType)

			// Hall management
			admin.GET("/halls", hallHandler.List)
			admin.POST("/halls", hallHandler.Create)
			admin.PUT("/halls/:id", hallHandler.Update)
			admin.DELETE("/halls/:id", hallHandler.Delete)
			admin.GET("/halls/:id/seats", hallHandler.GetSeats)
			admin.POST("/halls/:id/seats", hallHandler.CreateSeat)
			admin.POST("/halls/:id/seats/bulk", hallHandler.BulkCreateSeats)
			admin.PUT("/halls/:id/seats/:seat_id", hallHandler.UpdateSeat)
			admin.DELETE("/halls/:id/seats/:seat_id", hallHandler.DeleteSeat)
			admin.POST("/halls/:id/seats/:seat_id/toggle", hallHandler.ToggleSeatStatus)
			admin.POST("/seats/bulk-update", hallHandler.BulkUpdateSeats)

			// Booking management
			admin.GET("/bookings", bookingHandler.AdminList)
			admin.PUT("/bookings/:id/status", bookingHandler.AdminUpdateStatus)
			admin.POST("/bookings/:id/resend-email", bookingHandler.ResendTicketEmail)

			// Ticket validation/redemption
			admin.POST("/tickets/validate", bookingHandler.ValidateTicket)
			admin.POST("/tickets/redeem", bookingHandler.RedeemTicket)
		}
	}

	return r
}
