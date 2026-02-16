package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"filmhouse-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"gorm.io/gorm"
)

type FilmHandler struct {
	db *gorm.DB
}

func NewFilmHandler(db *gorm.DB) *FilmHandler {
	return &FilmHandler{db: db}
}

// List returns all active films with optional date filter
func (h *FilmHandler) List(c *gin.Context) {
	var films []models.Film
	query := h.db.Where("is_active = ?", true)

	// Filter by date if provided
	if dateStr := c.Query("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
			endOfDay := startOfDay.Add(24 * time.Hour)
			
			query = query.Where("id IN (?)", 
				h.db.Model(&models.Screening{}).
					Select("film_id").
					Where("start_time >= ? AND start_time < ? AND is_active = ?", 
						startOfDay, endOfDay, true))
		}
	}

	if err := query.Order("is_featured DESC, title ASC").Find(&films).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch films"})
		return
	}

	c.JSON(http.StatusOK, films)
}

// Featured returns featured films for the banner
func (h *FilmHandler) Featured(c *gin.Context) {
	var films []models.Film
	if err := h.db.Where("is_active = ? AND is_featured = ?", true, true).
		Limit(5).Find(&films).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch featured films"})
		return
	}

	c.JSON(http.StatusOK, films)
}

// Get returns a single film by ID or slug
func (h *FilmHandler) Get(c *gin.Context) {
	identifier := c.Param("id")
	
	var film models.Film
	query := h.db.Where("is_active = ?", true)
	
	// Try to parse as ID first
	if id, err := strconv.ParseUint(identifier, 10, 32); err == nil {
		query = query.Where("id = ?", id)
	} else {
		query = query.Where("slug = ?", identifier)
	}

	if err := query.First(&film).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found"})
		return
	}

	c.JSON(http.StatusOK, film)
}

// GetScreenings returns screenings for a film
func (h *FilmHandler) GetScreenings(c *gin.Context) {
	filmID := c.Param("id")
	
	var screenings []models.Screening
	query := h.db.Preload("Hall").
		Where("film_id = ? AND is_active = ? AND start_time > ?", 
			filmID, true, time.Now())

	// Filter by date if provided
	if dateStr := c.Query("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
			endOfDay := startOfDay.Add(24 * time.Hour)
			query = query.Where("start_time >= ? AND start_time < ?", startOfDay, endOfDay)
		}
	}

	if err := query.Order("start_time ASC").Find(&screenings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch screenings"})
		return
	}

	c.JSON(http.StatusOK, screenings)
}

// Admin handlers

func (h *FilmHandler) Create(c *gin.Context) {
	var film models.Film
	if err := c.ShouldBindJSON(&film); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate slug if not provided
	if film.Slug == "" {
		film.Slug = slug.Make(film.Title)
	}

	if err := h.db.Create(&film).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create film"})
		return
	}

	c.JSON(http.StatusCreated, film)
}

func (h *FilmHandler) Update(c *gin.Context) {
	id := c.Param("id")
	
	var film models.Film
	if err := h.db.First(&film, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found"})
		return
	}

	if err := c.ShouldBindJSON(&film); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&film).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update film"})
		return
	}

	c.JSON(http.StatusOK, film)
}

func (h *FilmHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Delete(&models.Film{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete film"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Film deleted"})
}

func (h *FilmHandler) AdminList(c *gin.Context) {
	var films []models.Film
	if err := h.db.Order("created_at DESC").Find(&films).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch films"})
		return
	}

	c.JSON(http.StatusOK, films)
}

// UploadPoster handles poster image upload
func (h *FilmHandler) UploadPoster(c *gin.Context) {
	id := c.Param("id")

	var film models.Film
	if err := h.db.First(&film, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found"})
		return
	}

	file, err := c.FormFile("poster")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed: jpg, jpeg, png, webp"})
		return
	}

	// Create uploads directory if not exists
	uploadDir := "./uploads/posters"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s-%s%s", film.Slug, uuid.New().String()[:8], ext)
	filepath := filepath.Join(uploadDir, filename)

	// Save file
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update film poster URL
	film.PosterURL = "/uploads/posters/" + filename
	if err := h.db.Save(&film).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update film"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Poster uploaded successfully",
		"poster_url": film.PosterURL,
	})
}

// UploadBanner handles banner image upload
func (h *FilmHandler) UploadBanner(c *gin.Context) {
	id := c.Param("id")

	var film models.Film
	if err := h.db.First(&film, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found"})
		return
	}

	file, err := c.FormFile("banner")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed: jpg, jpeg, png, webp"})
		return
	}

	// Create uploads directory if not exists
	uploadDir := "./uploads/banners"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s-banner-%s%s", film.Slug, uuid.New().String()[:8], ext)
	savePath := filepath.Join(uploadDir, filename)

	// Save file
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update film banner URL
	film.BannerURL = "/uploads/banners/" + filename
	if err := h.db.Save(&film).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update film"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Banner uploaded successfully",
		"banner_url": film.BannerURL,
	})
}
