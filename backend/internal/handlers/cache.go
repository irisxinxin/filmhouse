package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func setPublicCache(c *gin.Context, maxAgeSeconds int) {
	if maxAgeSeconds <= 0 {
		return
	}
	c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d, stale-while-revalidate=300", maxAgeSeconds, maxAgeSeconds))
}
