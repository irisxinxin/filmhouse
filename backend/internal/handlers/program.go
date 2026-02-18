package handlers

import (
	"net/http"
	"strconv"

	"filmhouse-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/gosimple/slug"
	"gorm.io/gorm"
)

type ProgramHandler struct {
	db *gorm.DB
}

func NewProgramHandler(db *gorm.DB) *ProgramHandler {
	return &ProgramHandler{db: db}
}

// ListPrograms returns all active programs (public)
func (h *ProgramHandler) ListPrograms(c *gin.Context) {
	var programs []models.Program
	if err := h.db.Where("is_active = ?", true).
		Order("sort_order ASC").Find(&programs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch programs"})
		return
	}

	c.JSON(http.StatusOK, programs)
}

// GetProgram returns a single program by slug with associated films (public)
func (h *ProgramHandler) GetProgram(c *gin.Context) {
	slugParam := c.Param("slug")

	var program models.Program
	if err := h.db.Where("slug = ? AND is_active = ?", slugParam, true).
		First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	// Load associated films ordered by program_films.sort_order
	var programFilms []models.ProgramFilm
	h.db.Where("program_id = ?", program.ID).Order("sort_order ASC").Find(&programFilms)

	var filmIDs []uint
	for _, pf := range programFilms {
		filmIDs = append(filmIDs, pf.FilmID)
	}

	var films []models.Film
	if len(filmIDs) > 0 {
		h.db.Where("id IN ? AND is_active = ?", filmIDs, true).Find(&films)
		// Reorder films by program_films.sort_order
		filmMap := make(map[uint]models.Film)
		for _, f := range films {
			filmMap[f.ID] = f
		}
		ordered := make([]models.Film, 0, len(filmIDs))
		for _, id := range filmIDs {
			if f, ok := filmMap[id]; ok {
				ordered = append(ordered, f)
			}
		}
		films = ordered
	}

	program.Films = films
	c.JSON(http.StatusOK, program)
}

// AdminListPrograms returns all programs for admin (including inactive)
func (h *ProgramHandler) AdminListPrograms(c *gin.Context) {
	var programs []models.Program
	if err := h.db.Order("sort_order ASC").Find(&programs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch programs"})
		return
	}

	c.JSON(http.StatusOK, programs)
}

// AdminCreateProgram creates a new program
func (h *ProgramHandler) AdminCreateProgram(c *gin.Context) {
	var program models.Program
	if err := c.ShouldBindJSON(&program); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if program.Slug == "" {
		program.Slug = slug.Make(program.Name)
	}

	if err := h.db.Create(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create program"})
		return
	}

	c.JSON(http.StatusCreated, program)
}

// AdminUpdateProgram updates an existing program
func (h *ProgramHandler) AdminUpdateProgram(c *gin.Context) {
	id := c.Param("id")

	var program models.Program
	if err := h.db.First(&program, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	if err := c.ShouldBindJSON(&program); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update program"})
		return
	}

	c.JSON(http.StatusOK, program)
}

// AdminDeleteProgram soft-deletes a program
func (h *ProgramHandler) AdminDeleteProgram(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.Delete(&models.Program{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Program deleted"})
}

// AdminAddFilmToProgram adds a film to a program
func (h *ProgramHandler) AdminAddFilmToProgram(c *gin.Context) {
	programID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid program ID"})
		return
	}

	var input struct {
		FilmID    uint `json:"film_id" binding:"required"`
		SortOrder int  `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify program exists
	var program models.Program
	if err := h.db.First(&program, programID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	// Verify film exists
	var film models.Film
	if err := h.db.First(&film, input.FilmID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found"})
		return
	}

	pf := models.ProgramFilm{
		ProgramID: uint(programID),
		FilmID:    input.FilmID,
		SortOrder: input.SortOrder,
	}

	if err := h.db.FirstOrCreate(&pf, models.ProgramFilm{
		ProgramID: uint(programID),
		FilmID:    input.FilmID,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add film to program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Film added to program"})
}

// AdminRemoveFilmFromProgram removes a film from a program
func (h *ProgramHandler) AdminRemoveFilmFromProgram(c *gin.Context) {
	programID := c.Param("id")
	filmID := c.Param("filmId")

	result := h.db.Where("program_id = ? AND film_id = ?", programID, filmID).
		Delete(&models.ProgramFilm{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove film from program"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Film not found in program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Film removed from program"})
}
