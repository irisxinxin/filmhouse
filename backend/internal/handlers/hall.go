package handlers

import (
	"encoding/json"
	"net/http"

	"filmhouse-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SeatLayout JSON structures
type SeatLayoutCell struct {
	Type     string `json:"type"`               // "seat", "aisle", "empty"
	Number   int    `json:"number,omitempty"`    // seat number (only for type=seat)
	SeatType string `json:"seat_type,omitempty"` // standard, premium, wheelchair
	Disabled bool   `json:"disabled,omitempty"`  // broken/disabled seat
}

type SeatLayoutRow struct {
	Label string           `json:"label"` // "A", "B", etc.
	Seats []SeatLayoutCell `json:"seats"`
}

type SeatLayout struct {
	Rows []SeatLayoutRow `json:"rows"`
}

type HallHandler struct {
	db *gorm.DB
}

func NewHallHandler(db *gorm.DB) *HallHandler {
	return &HallHandler{db: db}
}

// List returns all halls
func (h *HallHandler) List(c *gin.Context) {
	var halls []models.Hall
	if err := h.db.Where("is_active = ?", true).Find(&halls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch halls"})
		return
	}

	c.JSON(http.StatusOK, halls)
}

// Get returns a hall with its seats
func (h *HallHandler) Get(c *gin.Context) {
	id := c.Param("id")
	
	var hall models.Hall
	if err := h.db.Preload("Seats", "is_active = ?", true).
		First(&hall, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	c.JSON(http.StatusOK, hall)
}

// Admin handlers

func (h *HallHandler) Create(c *gin.Context) {
	var hall models.Hall
	if err := c.ShouldBindJSON(&hall); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&hall).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create hall"})
		return
	}

	c.JSON(http.StatusCreated, hall)
}

func (h *HallHandler) Update(c *gin.Context) {
	id := c.Param("id")
	
	var hall models.Hall
	if err := h.db.First(&hall, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	if err := c.ShouldBindJSON(&hall); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&hall).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update hall"})
		return
	}

	c.JSON(http.StatusOK, hall)
}

func (h *HallHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	
	// Soft delete - just mark as inactive
	if err := h.db.Model(&models.Hall{}).Where("id = ?", id).
		Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete hall"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Hall deleted"})
}

// Seat management

func (h *HallHandler) GetSeats(c *gin.Context) {
	hallID := c.Param("id")
	
	var seats []models.Seat
	if err := h.db.Where("hall_id = ?", hallID).
		Order("`row` ASC, number ASC").
		Find(&seats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch seats"})
		return
	}

	c.JSON(http.StatusOK, seats)
}

func (h *HallHandler) CreateSeat(c *gin.Context) {
	hallID := c.Param("id")
	
	var seat models.Seat
	if err := c.ShouldBindJSON(&seat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify hall exists
	var hall models.Hall
	if err := h.db.First(&hall, hallID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	seat.HallID = hall.ID
	if err := h.db.Create(&seat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create seat"})
		return
	}

	c.JSON(http.StatusCreated, seat)
}

func (h *HallHandler) UpdateSeat(c *gin.Context) {
	seatID := c.Param("seat_id")
	
	var seat models.Seat
	if err := h.db.First(&seat, seatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Seat not found"})
		return
	}

	var req struct {
		Row      string `json:"row"`
		Number   int    `json:"number"`
		SeatType string `json:"seat_type"`
		IsActive *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Row != "" {
		seat.Row = req.Row
	}
	if req.Number > 0 {
		seat.Number = req.Number
	}
	if req.SeatType != "" {
		seat.SeatType = req.SeatType
	}
	if req.IsActive != nil {
		seat.IsActive = *req.IsActive
	}

	if err := h.db.Save(&seat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update seat"})
		return
	}

	c.JSON(http.StatusOK, seat)
}

func (h *HallHandler) DeleteSeat(c *gin.Context) {
	seatID := c.Param("seat_id")
	
	if err := h.db.Delete(&models.Seat{}, seatID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete seat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Seat deleted"})
}

// ToggleSeatStatus toggles a seat's active status (for broken seats)
func (h *HallHandler) ToggleSeatStatus(c *gin.Context) {
	seatID := c.Param("seat_id")
	
	var seat models.Seat
	if err := h.db.First(&seat, seatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Seat not found"})
		return
	}

	seat.IsActive = !seat.IsActive
	if err := h.db.Save(&seat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle seat status"})
		return
	}

	c.JSON(http.StatusOK, seat)
}

// BulkUpdateSeats updates multiple seats at once
func (h *HallHandler) BulkUpdateSeats(c *gin.Context) {
	var req struct {
		SeatIDs  []uint `json:"seat_ids" binding:"required"`
		IsActive *bool  `json:"is_active"`
		SeatType string `json:"seat_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SeatType != "" {
		updates["seat_type"] = req.SeatType
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No updates provided"})
		return
	}

	if err := h.db.Model(&models.Seat{}).Where("id IN ?", req.SeatIDs).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update seats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Seats updated", "count": len(req.SeatIDs)})
}

// Bulk seat operations

type BulkSeatRequest struct {
	Rows        []string `json:"rows" binding:"required"`        // ["A", "B", "C"]
	SeatsPerRow int      `json:"seats_per_row" binding:"required"`
	Aisles      []int    `json:"aisles"`                         // seat numbers to skip for aisles
	SeatType    string   `json:"seat_type"`
}

func (h *HallHandler) BulkCreateSeats(c *gin.Context) {
	hallID := c.Param("id")
	
	var req BulkSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var hall models.Hall
	if err := h.db.First(&hall, hallID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	// Delete existing seats and their ticket references (FK constraint)
	h.db.Exec("DELETE t FROM tickets t INNER JOIN seats s ON t.seat_id = s.id WHERE s.hall_id = ?", hall.ID)
	h.db.Exec("DELETE FROM seats WHERE hall_id = ?", hall.ID)

	// Create aisle map
	aisleMap := make(map[int]bool)
	for _, a := range req.Aisles {
		aisleMap[a] = true
	}

	seatType := req.SeatType
	if seatType == "" {
		seatType = "standard"
	}

	// Create seats
	var seats []models.Seat
	for _, row := range req.Rows {
		for num := 1; num <= req.SeatsPerRow; num++ {
			if aisleMap[num] {
				continue
			}
			seats = append(seats, models.Seat{
				HallID:   hall.ID,
				Row:      row,
				Number:   num,
				SeatType: seatType,
				IsActive: true,
			})
		}
	}

	if err := h.db.Create(&seats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create seats"})
		return
	}

	// Update hall capacity
	hall.Capacity = len(seats)
	h.db.Save(&hall)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Seats created",
		"count":   len(seats),
		"seats":   seats,
	})
}

// GetLayout returns the saved seat layout for a hall
func (h *HallHandler) GetLayout(c *gin.Context) {
	hallID := c.Param("id")

	var hall models.Hall
	if err := h.db.First(&hall, hallID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	if hall.SeatLayout == "" {
		c.JSON(http.StatusOK, gin.H{"rows": []interface{}{}})
		return
	}

	var layout SeatLayout
	if err := json.Unmarshal([]byte(hall.SeatLayout), &layout); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse layout"})
		return
	}

	c.JSON(http.StatusOK, layout)
}

// SaveLayout saves a custom seat layout and regenerates seat records
func (h *HallHandler) SaveLayout(c *gin.Context) {
	hallID := c.Param("id")

	var hall models.Hall
	if err := h.db.First(&hall, hallID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hall not found"})
		return
	}

	var layout SeatLayout
	if err := c.ShouldBindJSON(&layout); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Serialize layout to JSON
	layoutJSON, err := json.Marshal(layout)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize layout"})
		return
	}

	// Delete existing seats and their ticket references (FK constraint)
	// First delete tickets that reference seats in this hall
	h.db.Exec("DELETE t FROM tickets t INNER JOIN seats s ON t.seat_id = s.id WHERE s.hall_id = ?", hall.ID)
	// Then delete the seats
	h.db.Exec("DELETE FROM seats WHERE hall_id = ?", hall.ID)

	// Create seats from layout
	var seats []models.Seat
	for _, row := range layout.Rows {
		for _, cell := range row.Seats {
			if cell.Type != "seat" {
				continue
			}
			seatType := cell.SeatType
			if seatType == "" {
				seatType = "standard"
			}
			seats = append(seats, models.Seat{
				HallID:   hall.ID,
				Row:      row.Label,
				Number:   cell.Number,
				SeatType: seatType,
				IsActive: !cell.Disabled,
			})
		}
	}

	if len(seats) > 0 {
		if err := h.db.Create(&seats).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create seats"})
			return
		}
	}

	// Update hall
	hall.SeatLayout = string(layoutJSON)
	hall.Capacity = len(seats)
	if err := h.db.Save(&hall).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update hall"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Layout saved",
		"seat_count":  len(seats),
		"seat_layout": layout,
		"seats":       seats,
	})
}
