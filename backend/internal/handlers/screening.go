package handlers

import (
	"net/http"
	"strconv"
	"time"

	"filmhouse-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ScreeningHandler struct {
	db *gorm.DB
}

func NewScreeningHandler(db *gorm.DB) *ScreeningHandler {
	return &ScreeningHandler{db: db}
}

// List returns screenings with optional filters
func (h *ScreeningHandler) List(c *gin.Context) {
	var screenings []models.Screening
	query := h.db.Preload("Film").Preload("Hall").
		Where("is_active = ? AND start_time > ?", true, time.Now())

	// Filter by date
	if dateStr := c.Query("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
			endOfDay := startOfDay.Add(24 * time.Hour)
			query = query.Where("start_time >= ? AND start_time < ?", startOfDay, endOfDay)
		}
	}

	// Filter by film
	if filmID := c.Query("film_id"); filmID != "" {
		query = query.Where("film_id = ?", filmID)
	}

	if err := query.Order("start_time ASC").Find(&screenings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch screenings"})
		return
	}

	setPublicCache(c, 60)
	c.JSON(http.StatusOK, screenings)
}

// Get returns a single screening with film, hall, and prices
func (h *ScreeningHandler) Get(c *gin.Context) {
	id := c.Param("id")
	
	var screening models.Screening
	if err := h.db.Preload("Film").Preload("Hall").
		Preload("Prices.TicketType").
		First(&screening, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	setPublicCache(c, 60)
	c.JSON(http.StatusOK, screening)
}

// GetByDate returns all screenings grouped by film for a specific date
func (h *ScreeningHandler) GetByDate(c *gin.Context) {
	dateStr := c.Param("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
	endOfDay := startOfDay.Add(24 * time.Hour)

	var screenings []models.Screening
	if err := h.db.Preload("Film").Preload("Hall").
		Where("is_active = ? AND start_time >= ? AND start_time < ?", 
			true, startOfDay, endOfDay).
		Order("start_time ASC").
		Find(&screenings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch screenings"})
		return
	}

	// Group by film
	filmScreenings := make(map[uint]struct {
		Film       models.Film       `json:"film"`
		Screenings []models.Screening `json:"screenings"`
	})

	for _, s := range screenings {
		if fs, exists := filmScreenings[s.FilmID]; exists {
			fs.Screenings = append(fs.Screenings, s)
			filmScreenings[s.FilmID] = fs
		} else {
			filmScreenings[s.FilmID] = struct {
				Film       models.Film       `json:"film"`
				Screenings []models.Screening `json:"screenings"`
			}{
				Film:       *s.Film,
				Screenings: []models.Screening{s},
			}
		}
	}

	// Convert to slice
	result := make([]struct {
		Film       models.Film       `json:"film"`
		Screenings []models.Screening `json:"screenings"`
	}, 0, len(filmScreenings))
	
	for _, fs := range filmScreenings {
		result = append(result, fs)
	}

	setPublicCache(c, 60)
	c.JSON(http.StatusOK, result)
}

// HomeList returns a lightweight map of upcoming screenings grouped by film
func (h *ScreeningHandler) HomeList(c *gin.Context) {
	days := 30
	limit := 3

	if v := c.Query("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			days = parsed
		}
	}
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	endTime := time.Now().Add(time.Duration(days) * 24 * time.Hour)

	type homeScreening struct {
		ID        uint      `json:"id"`
		FilmID    uint      `json:"film_id"`
		StartTime time.Time `json:"start_time"`
	}

	var screenings []homeScreening
	if err := h.db.Model(&models.Screening{}).
		Select("id, film_id, start_time").
		Where("is_active = ? AND start_time > ? AND start_time < ?", true, time.Now(), endTime).
		Order("start_time ASC").
		Find(&screenings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch screenings"})
		return
	}

	result := make(map[uint][]homeScreening)
	for _, s := range screenings {
		if len(result[s.FilmID]) >= limit {
			continue
		}
		result[s.FilmID] = append(result[s.FilmID], s)
	}

	setPublicCache(c, 60)
	c.JSON(http.StatusOK, result)
}

// Admin handlers

func (h *ScreeningHandler) Create(c *gin.Context) {
	var req struct {
		FilmID    uint    `json:"film_id" binding:"required"`
		HallID    uint    `json:"hall_id" binding:"required"`
		StartTime string  `json:"start_time" binding:"required"`
		Price     float64 `json:"price" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
		return
	}

	// Get film duration to calculate end time
	var film models.Film
	if err := h.db.First(&film, req.FilmID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Film not found"})
		return
	}

	endTime := startTime.Add(time.Duration(film.Duration) * time.Minute)

	// Check for conflicts
	var conflictCount int64
	h.db.Model(&models.Screening{}).
		Where("hall_id = ? AND is_active = ? AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))",
			req.HallID, true, endTime, startTime, endTime, startTime).
		Count(&conflictCount)

	if conflictCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot conflicts with existing screening"})
		return
	}

	screening := models.Screening{
		FilmID:    req.FilmID,
		HallID:    req.HallID,
		StartTime: startTime,
		EndTime:   endTime,
		Price:     req.Price,
		IsActive:  true,
	}

	if err := h.db.Create(&screening).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create screening"})
		return
	}

	h.db.Preload("Film").Preload("Hall").First(&screening, screening.ID)
	c.JSON(http.StatusCreated, screening)
}

func (h *ScreeningHandler) Update(c *gin.Context) {
	id := c.Param("id")
	
	var screening models.Screening
	if err := h.db.First(&screening, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	var req struct {
		Price    *float64 `json:"price"`
		IsActive *bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Price != nil {
		screening.Price = *req.Price
	}
	if req.IsActive != nil {
		screening.IsActive = *req.IsActive
	}

	if err := h.db.Save(&screening).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update screening"})
		return
	}

	c.JSON(http.StatusOK, screening)
}

func (h *ScreeningHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	
	// Check for existing bookings
	var bookingCount int64
	h.db.Model(&models.Booking{}).
		Where("screening_id = ? AND status IN ?", id, []string{"pending", "confirmed"}).
		Count(&bookingCount)

	if bookingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete screening with existing bookings"})
		return
	}

	if err := h.db.Delete(&models.Screening{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete screening"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Screening deleted"})
}

func (h *ScreeningHandler) AdminList(c *gin.Context) {
	var screenings []models.Screening
	query := h.db.Preload("Film").Preload("Hall")

	// Filter by date range
	if from := c.Query("from"); from != "" {
		if fromDate, err := time.Parse("2006-01-02", from); err == nil {
			query = query.Where("start_time >= ?", fromDate)
		}
	}
	if to := c.Query("to"); to != "" {
		if toDate, err := time.Parse("2006-01-02", to); err == nil {
			query = query.Where("start_time < ?", toDate.Add(24*time.Hour))
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Screening{}).Count(&total)

	if err := query.Order("start_time DESC").
		Offset(offset).Limit(limit).
		Find(&screenings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch screenings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  screenings,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetTicketTypes returns all available ticket types
func (h *ScreeningHandler) GetTicketTypes(c *gin.Context) {
	var ticketTypes []models.TicketType
	if err := h.db.Where("is_active = ?", true).
		Order("sort_order ASC").
		Find(&ticketTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ticket types"})
		return
	}
	c.JSON(http.StatusOK, ticketTypes)
}

// GetScreeningPrices returns prices for a specific screening
func (h *ScreeningHandler) GetScreeningPrices(c *gin.Context) {
	screeningID := c.Param("id")
	
	var prices []models.ScreeningPrice
	if err := h.db.Preload("TicketType").
		Where("screening_id = ? AND is_active = ?", screeningID, true).
		Find(&prices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prices"})
		return
	}

	// If no specific prices set, return default based on screening base price
	if len(prices) == 0 {
		var screening models.Screening
		if err := h.db.First(&screening, screeningID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
			return
		}

		var ticketTypes []models.TicketType
		h.db.Where("is_active = ?", true).Order("sort_order ASC").Find(&ticketTypes)

		// Generate default prices based on ticket type
		for _, tt := range ticketTypes {
			price := screening.Price
			switch tt.Name {
			case "Member":
				price = screening.Price * 0.85 // 15% off
			case "Student":
				price = screening.Price * 0.80 // 20% off
			case "Senior":
				price = screening.Price * 0.80 // 20% off
			case "Child":
				price = screening.Price * 0.70 // 30% off
			}
			prices = append(prices, models.ScreeningPrice{
				ScreeningID:  screening.ID,
				TicketTypeID: tt.ID,
				TicketType:   &tt,
				Price:        price,
				IsActive:     true,
			})
		}
	}

	c.JSON(http.StatusOK, prices)
}

// SetScreeningPrices sets/updates prices for a screening (admin)
func (h *ScreeningHandler) SetScreeningPrices(c *gin.Context) {
	screeningID := c.Param("id")
	
	var screening models.Screening
	if err := h.db.First(&screening, screeningID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Screening not found"})
		return
	}

	var req struct {
		Prices []struct {
			TicketTypeID uint    `json:"ticket_type_id" binding:"required"`
			Price        float64 `json:"price" binding:"required"`
			IsActive     bool    `json:"is_active"`
		} `json:"prices" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Delete existing prices and insert new ones
	h.db.Where("screening_id = ?", screeningID).Delete(&models.ScreeningPrice{})

	for _, p := range req.Prices {
		price := models.ScreeningPrice{
			ScreeningID:  screening.ID,
			TicketTypeID: p.TicketTypeID,
			Price:        p.Price,
			IsActive:     p.IsActive,
		}
		h.db.Create(&price)
	}

	// Return updated prices
	var prices []models.ScreeningPrice
	h.db.Preload("TicketType").
		Where("screening_id = ?", screeningID).
		Find(&prices)

	c.JSON(http.StatusOK, prices)
}

// BulkSetPrices sets prices for multiple screenings at once (admin)
func (h *ScreeningHandler) BulkSetPrices(c *gin.Context) {
	var req struct {
		ScreeningIDs []uint `json:"screening_ids" binding:"required"`
		Prices       []struct {
			TicketTypeID uint    `json:"ticket_type_id" binding:"required"`
			Price        float64 `json:"price" binding:"required"`
		} `json:"prices" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, screeningID := range req.ScreeningIDs {
		// Delete existing prices
		h.db.Where("screening_id = ?", screeningID).Delete(&models.ScreeningPrice{})

		// Insert new prices
		for _, p := range req.Prices {
			price := models.ScreeningPrice{
				ScreeningID:  screeningID,
				TicketTypeID: p.TicketTypeID,
				Price:        p.Price,
				IsActive:     true,
			}
			h.db.Create(&price)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Prices updated",
		"count":   len(req.ScreeningIDs),
	})
}

// Admin: Manage ticket types
func (h *ScreeningHandler) CreateTicketType(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		SortOrder   int    `json:"sort_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticketType := models.TicketType{
		Name:        req.Name,
		Description: req.Description,
		SortOrder:   req.SortOrder,
		IsActive:    true,
	}

	if err := h.db.Create(&ticketType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket type"})
		return
	}

	c.JSON(http.StatusCreated, ticketType)
}

func (h *ScreeningHandler) UpdateTicketType(c *gin.Context) {
	id := c.Param("id")
	
	var ticketType models.TicketType
	if err := h.db.First(&ticketType, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket type not found"})
		return
	}

	var req struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		SortOrder   *int    `json:"sort_order"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != nil {
		ticketType.Name = *req.Name
	}
	if req.Description != nil {
		ticketType.Description = *req.Description
	}
	if req.SortOrder != nil {
		ticketType.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		ticketType.IsActive = *req.IsActive
	}

	if err := h.db.Save(&ticketType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket type"})
		return
	}

	c.JSON(http.StatusOK, ticketType)
}
